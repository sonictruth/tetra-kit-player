const statusDiv = document.getElementById('status');
const screenDiv = document.getElementById('screen');
const startBtn = document.getElementById('startbtn');
const historyEl = document.getElementById('history');

const queue = new ZQueue({ max: 1 });

startBtn.addEventListener('click', () => start());
screenDiv.style.display = 'none';

const log = msg => {
    statusDiv.innerHTML = msg;
}

function start() {
    const socket = io();
    startBtn.style.display = 'none';
    screenDiv.style.display = '';
    socket.on('connect', () => log('Connected.'));
    socket.on('init', () => log('Waiting for new messages...'));
    socket.on('disconnect', () => log('Disconnected. Try reloading the page.'));
    socket.on('message', message => log(message));
    socket.on('newfile', fileName => handleNewFile(fileName));
    socket.on('history', newHistory => renderHistory(newHistory));
}

function handleNewFile(fileName) {
    queue.run(() => playRawUrl(fileName))
        .then(() => addHistoyItem(fileName, Date.now()));

}

function formatTS(ts) {
    const date = new Date(ts);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function addHistoyItem(fileName, date) {
    const buttonEl = document.createElement("BUTTON");
    buttonEl.innerHTML = `&#9654; ${formatTS(date)}`;
    buttonEl.addEventListener('click', () => {
        playRawUrl(fileName);
    })
    historyEl.insertBefore(buttonEl, historyEl.firstChild);
}

function renderHistory(history) {
    history.reverse().forEach(historyItem => {
        addHistoyItem(historyItem.fileName, historyItem.date);
    });
}

function playRawUrl(url) {
    return new Promise((resolve, reject) => {
        getRawAsWavBlob(url)
            .then(urlObject => {
                const wavesurfer = WaveSurfer.create({
                    container: '#waveform',
                    waveColor: 'black',
                    cursorColor: 'green',
                    progressColor: 'gray',
                });
                wavesurfer.loadBlob(urlObject);
                wavesurfer.drawer.on('click', (e) => wavesurfer.playPause())
                wavesurfer.on('ready', () => wavesurfer.play());
                wavesurfer.on('finish', () => { resolve(url); wavesurfer.destroy(); });
                wavesurfer.on('error', (error) => reject(error));
            })
            .catch(error => reject(error));
    });
}

function getRawAsWavBlob(url) {
    return fetch(url)
        .then(response =>
            response.arrayBuffer()
                .then((buffer) => {
                    const type = Uint16Array;
                    const wavHeader = new Uint8Array(buildWaveHeader({
                        numFrames: buffer.byteLength / type.BYTES_PER_ELEMENT,
                        bytesPerSample: type.BYTES_PER_ELEMENT,
                        sampleRate: 8000,
                        numChannels: 1,
                        format: 1,
                    }));
                    const wavBytes = new Uint8Array(wavHeader.length + buffer.byteLength);
                    wavBytes.set(wavHeader, 0);
                    wavBytes.set(new Uint8Array(buffer), wavHeader.length);

                    const blob = new Blob([wavBytes], { type: 'audio/wav' });
                    return blob;
                    // return URL.createObjectURL(blob);
                }
                ))
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

