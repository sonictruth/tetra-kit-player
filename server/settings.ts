export const webAudioPathPrefix = '/audio';

export const tetraKitLogPath = process.env.TETRA_KIT_LOG_PATH || '';
export const tetraKitRawPath = process.env.TETRA_KIT_PATH || '';
export const rawExtension = '.raw';
export const processedExtension = '.done';
export const undecodedExtention = '.out';

export const username = process.env.USERNAME || 'admin';
export const password = process.env.PASSWORD || 'adm1n';
export const isSecure = process.env.SECURE === 'true' ? true : false;
export const isPublic = process.env.PUBLIC === 'true' ? true : false;
export const serverPort = process.env.PORT;

export const isDev = process.env.TS_NODE_DEV === 'true' ? true : false;

export const privateKeyPath = './selfsigned.key';
export const privateCaPath = './selfsigned.crt';

export const maxHistoryItems = 2000;
export const minimumFilesSize = 10000;
