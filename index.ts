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
const users: IUser = {};
let history: IHistory[]  = [];
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
      waitForFile(fullPathToRawFile).then( fileSize => {
        const fullPathToRawFileDone = fullPathToRawFile + '.done';
        fs.renameSync(fullPathToRawFile, fullPathToRawFileDone);

        broadcast('Streaming ' + fileName);
        const webPathToRawFileDone = webAudioPathPrefix + '/' + fileName + '.done';
        io.emit('newfile', webPathToRawFileDone);
        addToHistory(webPathToRawFileDone, <number>fileSize);
        delete knownFiles[fileName];
      })
      knownFiles[fileName] = true;
    }
  });

});

const waitForFile = (filePath: string) => {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    function checkLoop() {
      clearTimeout(timeoutId);
      const stat = fs.statSync(filePath);
      const lastChange = stat.mtimeMs;
      const now = Date.now()
      const diff = now - lastChange;

      if (diff > maxChangesDiffMs) {
        resolve(stat.size);
      } else {
        timeoutId = setTimeout(checkLoop, checkForChangesDiffMs);
      }
    }
    checkLoop();
  })
};

const addToHistory = (fileName:string, size: number = 0):void => {
  if(size < ignoreFileSize) {
    return;
  }
  history.unshift({fileName, date: Date.now(), size});
  if(history.length > maxHistoryLength) {
    history.slice(0, maxHistoryLength);
  }
}

const broadcast = (message: any) => {
  io.emit('message', message);
}

io.on('connection', (socket) => {
  socket.emit('init');
  socket.emit('history', history);
});
