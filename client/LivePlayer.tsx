import PQueue from "p-queue";

import React, { useState, useEffect, useRef } from "react";

import { useHistoryStore } from "./stores";
import { convertSimpleRecording } from "./utils";
import Player from "./Player";
import "./LivePlayer.css";

export default () => {
    const socket = useHistoryStore((state) => state.socket);
    const addToHistory = useHistoryStore((state) => state.add);

    const [queueSize, setQueueSize] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [currentRecording, setCurrentRecording] = useState<Recording>();

    const resolveRef = useRef<Function>();

    const handleOnFinish = () => {
        addToHistory(currentRecording);
        setCurrentRecording(null);
        resolveRef.current();
    };

    const handlePlayPause = (isPlaying) => setIsPlaying(!isPlaying);


    useEffect(() => {
        const queue = new PQueue({ concurrency: 1 });
        queue.on("add", () => {
            setQueueSize(queue.size+1);
        });
        queue.on("next", () => {
            setQueueSize(queue.size);
        });
        function newMessagHandler(simpleRecording: SimpleRecording) {

            const recording = convertSimpleRecording(simpleRecording);
            queue.add(() => {
                return new Promise((resolve, reject) => {
                    setCurrentRecording(recording);
                    resolveRef.current = resolve;
                });
            });
        }
        socket.on("newRecording", newMessagHandler);
        return () => {
            queue.removeAllListeners();
            queue.clear();
            socket.off("newRecording", newMessagHandler);
        };
    }, []);

    return (
        <div className="live-player-container">
            { isPlaying &&
                <div className="live-player-status">
                    {queueSize === 0
                        ? "Waiting for new messages..."
                        : `${queueSize} new message(s). Press play to stream.`}
                </div>}
            { currentRecording &&
                <div className="live-player-bottom">
                    CID: {currentRecording.cid} Usage Marker: {currentRecording.usageMarker}
                </div>
            }
            <Player height={80} url={currentRecording?.url} onFinish={handleOnFinish} onPlayPause={handlePlayPause}></Player>
        </div>
    );
};
