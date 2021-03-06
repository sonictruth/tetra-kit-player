import create, { State } from 'zustand';
import io from 'socket.io-client';

import { convertSimpleRecordings } from './utils';

interface HistoryState extends State {
    socket: SocketIOClient.Socket,
    recordings: Recording[],
    load: () => void,
    add: (recording: Recording) => void,
}


const socket = io();

socket.on('connect', () => console.log('Connected...'));
socket.on('disconnect', () => console.error('Disconnected. Try reloading the page.'));
socket.on('init', () => console.log('Waiting for new messages...'));
socket.on('message', message => console.log(message));

export const useHistoryStore = create<HistoryState>(set => ({
    socket: socket,
    recordings: [],
    load: () => {
        socket.emit('getHistory', (simpleRecordings: SimpleRecording[]) => {
            const newRecordings = convertSimpleRecordings(simpleRecordings);
            set({ recordings: newRecordings });
        });
    },
    add: (recording) => {
        set(state => {
            return {
                recordings: [recording, ...state.recordings],
            }
        });
    },
}));

