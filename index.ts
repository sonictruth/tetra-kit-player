import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'socket.io';

const tetraKitRawPath = '../tetra-kit/recorder/raw';
const publicPath = 'public';
const webAudioPathPrefix = '/audio';
const indexPath = `${__dirname}/../${publicPath}/index.html`;
const checkForChangesDiffMs = 2500;
const maxChangesDiffMs = 10000;
const rawExtension = '.raw';
const users = { 'admin': 'admins3cret!' };

interface IHash {
  [details: string]: boolean;
}
const knownFiles: IHash = {};

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
app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

const server = http.createServer(app);
const io = new Server(server);

server.listen(process.env.PORT || 8080, () => {
  console.log(`Server started.`, server.address());

  fs.watch(tetraKitRawPath, (eventType, fileName) => {
    const fullPathToRawFile = path.join(tetraKitRawPath, fileName);
    if (
      eventType === 'rename' &&
      fileName.endsWith(rawExtension) &&
      !knownFiles[fileName] &&
      fs.existsSync(fullPathToRawFile)
    ) {
      // console.log('Waiting for: ', fileName);
      broadcast('New: ' + fileName);
      waitForFile(fullPathToRawFile).then(() => {
        const fullPathToRawFileDone = fullPathToRawFile + '.done';
        fs.renameSync(fullPathToRawFile, fullPathToRawFileDone);
        // console.log('Done: ', fileName);
        broadcast('Done: ' + fileName);
        const webPathToRawFileDone = webAudioPathPrefix + '/' + fileName + '.done';
        io.emit('newfile', webPathToRawFileDone);
        delete knownFiles[fileName];
      })
      knownFiles[fileName] = true;
    }
  });

});

io.on('connection', (socket) => {
  socket.emit('init');
});

const waitForFile = (filePath: string) => {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    function checkLoop() {
      clearTimeout(timeoutId);
      const lastChange = fs.statSync(filePath).mtimeMs;
      const now = Date.now()
      const diff = now - lastChange;

      if (diff > maxChangesDiffMs) {
        resolve(lastChange);
      } else {
        timeoutId = setTimeout(checkLoop, checkForChangesDiffMs);
      }
    }
    checkLoop();
  })
};

const broadcast = (message: any) => {
  io.emit('message', message)
}
