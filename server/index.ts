require('dotenv').config();

import * as fs from 'fs';
import * as path from 'path';

import History from './History';
import LogEmitter from './LogEmitter';

import waitForFile from './waitForFile';
import createServer from './createServer';

import {
    tetraKitRawPath,
    rawExtension,
    webAudioPathPrefix,
    doneExtension,
    tetraKitLogPath,
} from './settings';

if (!fs.existsSync(tetraKitRawPath)) {
    console.error('Tetra-kit path not found: ', tetraKitRawPath);
    process.exit(1);
}

createServer(async (app, io) => {
    const knownFiles: KeyValue = {};
    const history = new History();

    const broadcastMessage = (message: string): void => {
        io.emit('message', message);
    }

    await history.init();

    io.on('connection', socket => {
        socket.emit('init');
        socket.on('getHistory', (socketCallback: (history: SimpleRecording[]) => {}) =>
            socketCallback(history.getHistory())
        );
    });

    try {
        const logEmitter = new LogEmitter(tetraKitLogPath);
        logEmitter.on('log', log => io.emit('cmceLog', log))
    } catch (exception) {
        console.error('Log emitter failed: ', exception)
    }

    fs.watch(tetraKitRawPath, (eventType, fileName) => {
        const fullPathToRawFile = path.join(tetraKitRawPath, fileName);
        if (
            eventType === 'rename' &&
            fileName.endsWith(rawExtension) &&
            !knownFiles[fileName] &&
            fs.existsSync(fullPathToRawFile)
        ) {

            broadcastMessage('New file detected: ' + fileName);
            waitForFile(fullPathToRawFile).then(fileStat => {
                const fullPathToRawFileDone = fullPathToRawFile + doneExtension;
                fs.renameSync(fullPathToRawFile, fullPathToRawFileDone);


                const recordingURL = webAudioPathPrefix + '/' + fileName + doneExtension;
                const newRecording: SimpleRecording = {
                    url: recordingURL,
                    size: fileStat.size,
                    ts: fileStat.mtime.getTime(),
                }
                history.addToHistory(newRecording);

                broadcastMessage('Sending:  ' + fileName);
                io.emit('newRecording', newRecording);
                delete knownFiles[fileName];
            })
            knownFiles[fileName] = true;
        }
    });
});
