require('dotenv').config();

import * as fs from 'fs';
import * as path from 'path';

import History from './History';
import LogEmitter from './LogEmitter';

import waitForFile from './waitForFile';
import createServer from './createServer';

import decoder from './decoder';

import {
    tetraKitRawPath,
    rawExtension,
    undecodedExtention,
    webAudioPathPrefix,
    processedExtension,
    tetraKitLogPath,
    minimumFilesSize,
} from './settings';

if (!fs.existsSync(tetraKitRawPath)) {
    console.error('Tetra-kit path not found: ', tetraKitRawPath);
    process.exit(1);
}

createServer(async (app, io) => {

    const history = new History();

    // FIXME: renamed is fired on append also so we need to keep a hash of known files
    const processedFiles: KeyValue = {}; 

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

    fs.watch(tetraKitRawPath, async (eventType, fileName) => {
        const unprocessedFilePath = path.join(tetraKitRawPath, fileName);
        if (
            eventType === 'rename' &&
            !processedFiles[fileName] &&
            (fileName.endsWith(rawExtension) || fileName.endsWith(undecodedExtention)) &&
            fs.existsSync(unprocessedFilePath)
        ) {
            processedFiles[fileName] = true;
            const processedFilePath = unprocessedFilePath + processedExtension;
            const recordingURL = `${webAudioPathPrefix}/${fileName}${processedExtension}`;

            broadcastMessage('New file detected: ' + fileName);

            const fileStat = await waitForFile(unprocessedFilePath);


            if (fileName.endsWith(rawExtension)) {
                fs.renameSync(unprocessedFilePath, processedFilePath);
            }
            if (fileName.endsWith(undecodedExtention)) {
                await decoder(unprocessedFilePath, processedExtension);
                fs.unlinkSync(unprocessedFilePath);
            }

            if(fileStat.size < minimumFilesSize) {
                broadcastMessage('Size too small skipping: ' + fileName);
                return;
            }
      
            const newRecording: SimpleRecording = {
                url: recordingURL,
                size: fileStat.size,
                ts: fileStat.mtime.getTime(),
            }

            history.addToHistory(newRecording);

            broadcastMessage('Sending:  ' + fileName);
            io.emit('newRecording', newRecording);
            delete processedFiles[fileName];
        }
    });
});
