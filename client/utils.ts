const sampleRate = 8000;

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

export const getCIDandUMfromURL = (url: string): { cid: number, usageMarker: number } =>  {
    const matches = url.match(/\d+/g);
    const usageMarker = parseInt(matches[3]);
    const cid = parseInt(matches[2]);
    return {
        usageMarker,
        cid,
    }
}

export const timestampToDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
