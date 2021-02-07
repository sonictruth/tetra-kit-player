const statusDiv = document.getElementById('status');
const screenDiv = document.getElementById('screen');
const startBtn = document.getElementById('startbtn');
const audioEl = document.getElementById('audio');
const canvasEl = document.getElementById('canvas');

const queue = new ZQueue({ max: 1 });
const wave = new Wave();

wave.fromElement('audio', 'canvas', { type: 'bars' });

startBtn.addEventListener('click', () => start());
screenDiv.style.display = 'none';

const log = msg => {
    statusDiv.innerHTML = msg;
}

function start() {
    const socket = io();
    startBtn.style.display = 'none';
    screenDiv.style.display = '';
    socket.on('init', () => log('Connected. Please wait...'));
    socket.on('disconnect', () => log('Disconnected. Try to repload the page.'));
    socket.on('message', message => log(message));
    socket.on('newfile', filename => queue.run(() => playRawUrl(filename)));
}

function playRawUrl(url) {
    console.log(url);
    return new Promise((resolve, reject) => {
        fetch(url).then(response => {
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

                    const audio = document.querySelector('audio');
                    const blob = new Blob([wavBytes], { type: 'audio/wav' });
                    audio.src = URL.createObjectURL(blob);
                    audio.onended = () => resolve(url);
                    audio.onerror = (error) => reject(error);
                    audio.play();
                })
                .catch(error => reject(error));
        });
    });
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

