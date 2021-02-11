const sampleRate = 8000;
import { hexColors } from './colors';

export const invertColor = (hex: string, bw: boolean): string => {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
    }

    return "#" + padZero((255 - r).toString(16)) +
        padZero((255 - g).toString(16)) +
        padZero((255 - b).toString(16));
}

export const padZero = (str: string, len: number = 2): string => {
    const zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

export const getNumberColor = (number: number): string => {
    return hexColors[number % hexColors.length];
}

export const convertSimpleRecordings =
    (simpleRecordings: SimpleRecording[]): Recording[] => {
        return simpleRecordings.map((recording: SimpleRecording): Recording => {
            const cidAndUm = getCIDandUMfromURL(recording.url);
            return {
                url: recording.url,
                size: recording.size,
                ts: recording.ts,
                ...cidAndUm
            }
        }
        )
    }

export const getCIDandUMfromURL = (url: string): { cid: number, usageMarker: number } => {
    const matches = url.match(/\d+/g);
    const usageMarker = parseInt(matches[3]);
    const cid = parseInt(matches[2]);
    return {
        usageMarker,
        cid,
    }
}

export const timestampToDate = (timestamp: number) : {date: string, time: string} => {
    const date = new Date(timestamp);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
    };
}

export const sizeToSeconds = (size: number): string => {
    if (size) {
        return ((size / (sampleRate * 2)).toFixed(2) + 's');
    } else {
        return '';
    }
}

export const getRawAsWavBlob = (url: string): Promise<Blob> => {
    return fetch(url)
        .then(response =>
            response.arrayBuffer()
                .then((buffer) => {
                    const type = Uint16Array;
                    const wavHeader = new Uint8Array(buildWaveHeader({
                        numFrames: buffer.byteLength / type.BYTES_PER_ELEMENT,
                        bytesPerSample: type.BYTES_PER_ELEMENT,
                        sampleRate: sampleRate,
                        numChannels: 1,
                        format: 1,
                    }));
                    const wavBytes = new Uint8Array(wavHeader.length + buffer.byteLength);
                    wavBytes.set(wavHeader, 0);
                    wavBytes.set(new Uint8Array(buffer), wavHeader.length);

                    const blob = new Blob([wavBytes], { type: 'audio/wav' });
                    return blob;
                }
                ));
}

function buildWaveHeader(opts) {
    const numFrames = opts.numFrames;
    const numChannels = opts.numChannels || 1;
    const sampleRate = opts.sampleRate || 8000;
    const bytesPerSample = opts.bytesPerSample || 1;
    const format = opts.format

    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;

    const buffer = new ArrayBuffer(44);
    const dv = new DataView(buffer);

    let p = 0;

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            dv.setUint8(p + i, s.charCodeAt(i));
        }
        p += s.length;
    }

    function writeUint32(d) {
        dv.setUint32(p, d, true);
        p += 4;
    }

    function writeUint16(d) {
        dv.setUint16(p, d, true);
        p += 2;
    }

    writeString('RIFF');              // ChunkID
    writeUint32(dataSize + 36);       // ChunkSize
    writeString('WAVE');              // Format
    writeString('fmt ');              // Subchunk1ID
    writeUint32(16);                  // Subchunk1Size
    writeUint16(format);              // AudioFormat
    writeUint16(numChannels);         // NumChannels
    writeUint32(sampleRate);          // SampleRate
    writeUint32(byteRate);            // ByteRate
    writeUint16(blockAlign);          // BlockAlign
    writeUint16(bytesPerSample * 8);  // BitsPerSample
    writeString('data');              // Subchunk2ID
    writeUint32(dataSize);            // Subchunk2Size

    return buffer;
}
