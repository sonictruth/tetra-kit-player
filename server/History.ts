import * as path from 'path';
import * as fs from 'fs';

import {
    tetraKitRawPath,
    rawExtension,
    webAudioPathPrefix,
    doneExtension,
    minimumFilesSize,
    maxHistoryItems
} from './settings';


export default class {
    private history: SimpleRecording[] = [];

    getHistory = () => this.history;

    init = async () => {
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
            .forEach(recording => this.addToHistory(recording));
    }

    addToHistory(recording: SimpleRecording): void {
        if (recording.size < minimumFilesSize) {
            return;
        }
        this.history.unshift(recording);
        if (this.history.length > maxHistoryItems) {
            this.history.slice(0, maxHistoryItems);
        }
    }
}
