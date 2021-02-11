require('dotenv').config();
import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'socket.io';
import * as localtunnel from 'localtunnel';
import waitForFile from './waitForFile';
import * as Bundler from 'parcel-bundler';

const tetraKitRawPath = process.env.TETRA_KIT_PATH || '';
const isDev = process.env.TS_NODE_DEV === 'true' ? true : false;
const isSecure = process.env.SECURE === 'true' ? true : false;
const isPublic = process.env.PUBLIC === 'true' ? true : false;
const username = process.env.USERNAME || 'admin';
const password = process.env.PASSWORD || 'adm1n';
const serverPort = process.env.PORT;

const webAudioPathPrefix = '/audio';
const privateKeyPath = './selfsigned.key';
const privateCaPath = './selfsigned.crt';
const rawExtension = '.raw';
const doneExtension = '.done';

let history: SimpleRecording[] = [];
const maxHistoryLength = 2000;
const ignoreFileSize = 10000;
const knownFiles: KeyValue = {};

const bundler = new Bundler(path.join(__dirname, '../client/index.html'), {
    hmr: isDev
});

if (!fs.existsSync(tetraKitRawPath)) {
    console.error('Path not found: ', tetraKitRawPath);
    process.exit(1);
}

fs.readdirSync(tetraKitRawPath)
    .filter(fileName => (fileName.endsWith(rawExtension) || fileName.endsWith(doneExtension)))
    .map(fileName => {
        const stat = fs.statSync(path.join(tetraKitRawPath, fileName));
        return <SimpleRecording>{
            url: webAudioPathPrefix + '/' + fileName,
            size: stat.size,
            ts: stat.mtime.getTime(),
        }
    })
    .sort((a, b) => a.ts - b.ts)
    .forEach(recording => addToHistory(recording));


const app = express();

const users: KeyValue = {};
users[username] = password;
app.use(basicAuth({
    users,
    challenge: true,
}));

app.use(webAudioPathPrefix, express.static(tetraKitRawPath));
app.use(bundler.middleware());


let server: http.Server;
if (isSecure) {
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

if (isPublic && serverPort) {
    localtunnel({
        port: parseInt(serverPort),
        allow_invalid_cert: true,
        local_key: privateKeyPath,
        local_ca: privateCaPath,
        local_https: isSecure,
    })
        .then((tunnel: any) => {
            console.log(`Public URL ready: ${tunnel.url}`);
        });
}


server.listen(serverPort, () => {
    const port = (<any>server.address()).port;
    const type = isSecure ? 'https://' : 'http://';
    console.log(`Server started: ${type}localhost:${port}`);

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
                const recordingURL = webAudioPathPrefix + '/' + fileName + doneExtension;
                const newRecording: SimpleRecording = {
                    url: recordingURL,
                    size: fileStat.size,
                    ts: fileStat.mtime.getTime(),
                }
                addToHistory( newRecording );
                io.emit('newRecording', newRecording);
                delete knownFiles[fileName];
            })
            knownFiles[fileName] = true;
        }
    });
});


function addToHistory(recording: SimpleRecording): void {
    if (recording.size < ignoreFileSize) {
        return;
    }
    history.unshift(recording);
    if (history.length > maxHistoryLength) {
        history.slice(0, maxHistoryLength);
    }
}

function broadcast(message: any) {
    io.emit('message', message);
}

io.on('connection', socket => {
    socket.emit('init');
    socket.on('getHistory', (cb: Function) => cb(history));
    /*
    setInterval( ()=> {
        const random = history[Math.floor(Math.random() * history.length)];
        random.ts = Date.now();
        socket.emit('newRecording', random);
    }, 3000);
    */
});

