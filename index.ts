require('dotenv').config();
import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'socket.io';
import * as localtunnel from 'localtunnel';

const tetraKitRawPath = process.env.TETRA_KIT_PATH || '../tetra-kit/recorder/raw';
const publicPath = 'public';
const webAudioPathPrefix = '/audio';
const indexPath = `${__dirname}/../${publicPath}/index.html`;
const checkForChangesDiffMs = 2500;
const maxChangesDiffMs = 10000;
const privateKeyPath = './selfsigned.key';
const privateCaPath = './selfsigned.crt';
const rawExtension = '.raw';
const doneExtension = '.done';
const users: IUser = {};
let history: IHistory[] = [];
const maxHistoryLength = 2000;
const ignoreFileSize = 10000;
const knownFiles: IHash = {};

interface IHistory {
  fileName: string;
  date: number;
  size: number;
}
interface IUser {
  [username: string]: string;
}
interface IHash {
  [details: string]: boolean;
}


if (process.env.USERNAME && process.env.PASSWORD) {
  users[process.env.USERNAME] = process.env.PASSWORD;
}

if (!fs.existsSync(tetraKitRawPath)) {
  console.error('Path not found: ', tetraKitRawPath);
  process.exit(1);
}

fs.readdirSync(tetraKitRawPath)
  .filter(fileName => (fileName.endsWith(rawExtension) || fileName.endsWith(doneExtension)))
  .map(fileName => {
    const stat = fs.statSync(path.join(tetraKitRawPath, fileName));
    return {
      name: fileName,
      size: stat.size,
      time: stat.mtime.getTime(),
    }
  })
  .sort((a, b) => a.time - b.time)
  .forEach(fileObj => addToHistory(fileObj.name, fileObj.size, fileObj.time));


const app = express();
app.use(basicAuth({
  users,
  challenge: true,
}))

app.use(express.static(publicPath));
app.use(webAudioPathPrefix, express.static(tetraKitRawPath));
app.get('/', (req, res) => res.sendFile(indexPath));

let server: http.Server;
if (process.env.SECURE === 'true') {
  try {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const certificate = fs.readFileSync(privateCaPath, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
  } catch (error) {
    console.error(error, 'Make sure that you generated the server certificates using generate-cert.sh');
    process.exit(1);
  }
} else {
  server = http.createServer(app);
}

const io = new Server(server);

if (process.env.PUBLIC === 'true' && process.env.PORT) {
  localtunnel({
    port: parseInt(process.env.PORT),
    allow_invalid_cert: true,
    local_key: privateKeyPath,
    local_ca: privateCaPath,
    local_https: process.env.SECURE === 'true' ? true : false,
  })
    .then(tunnel => {
      console.log(`Public URL ready: ${tunnel.url}`);
    });
}

server.listen(process.env.PORT, () => {
  console.log(`Server started.`, server.address());

  fs.watch(tetraKitRawPath, (eventType, fileName) => {
    const fullPathToRawFile = path.join(tetraKitRawPath, fileName);
    if (
      eventType === 'rename' &&
      fileName.endsWith(rawExtension) &&
      !knownFiles[fileName] &&
      fs.existsSync(fullPathToRawFile)
    ) {

      broadcast('Receiving ' + fileName);
      waitForFile(fullPathToRawFile).then(fileStat => {
        const fullPathToRawFileDone = fullPathToRawFile + doneExtension;
        fs.renameSync(fullPathToRawFile, fullPathToRawFileDone);

        broadcast('Streaming ' + fileName);
        const webPathToRawFileDone = webAudioPathPrefix + '/' + fileName + doneExtension;
        io.emit('newfile', webPathToRawFileDone);
        addToHistory(webPathToRawFileDone, fileStat.size, fileStat.mtime.getTime());
        delete knownFiles[fileName];
      })
      knownFiles[fileName] = true;
    }
  });

});

function waitForFile(filePath: string): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    function checkLoop() {
      clearTimeout(timeoutId);
      const stat = fs.statSync(filePath);
      const lastChange = stat.mtimeMs;
      const now = Date.now()
      const diff = now - lastChange;

      if (diff > maxChangesDiffMs) {
        resolve(stat);
      } else {
        timeoutId = setTimeout(checkLoop, checkForChangesDiffMs);
      }
    }
    checkLoop();
  })
};

function addToHistory(fileName: string, size: number = 0, timestamp: number): void {
  if (size < ignoreFileSize) {
    return;
  }
  history.unshift({ fileName, date: timestamp, size });
  if (history.length > maxHistoryLength) {
    history.slice(0, maxHistoryLength);
  }
}

function broadcast(message: any) {
  io.emit('message', message);
}

io.on('connection', (socket) => {
  socket.emit('init');
  socket.emit('history', history);
});
