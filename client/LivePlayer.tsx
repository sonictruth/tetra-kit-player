import PQueue from "p-queue";

import React, { useState, useEffect, useRef } from "react";

import { useHistoryStore } from "./stores";
import { convertSimpleRecording } from "./utils";
import Player from "./Player";
import "./LivePlayer.css";

export default () => {
    const socket = useHistoryStore((state) => state.socket);
    const addToHistory = useHistoryStore((state) => state.add);
    const [url, setURL] = useState<string>(undefined);
    const [queueSize, setQueueSize] = useState<number>(0);
    const [showMessage, setShowMessage] = useState<boolean>(true);

    const resolveRef = useRef<Function>();
    const recodingRef = useRef<Recording>();

    const handleOnFinish = () => {
        addToHistory(recodingRef.current);
        resolveRef.current();
    };

    const handlePlayPause = (isPlaying) => setShowMessage(!isPlaying);


    useEffect(() => {
        const queue = new PQueue({ concurrency: 1 });
        queue.on("add", () => {
            setQueueSize(queue.size + 1);
        });
        queue.on("next", () => {
            setQueueSize(queue.size + 1);
        });
        function newMessagHandler(simpleRecording: SimpleRecording) {

            const recording = convertSimpleRecording(simpleRecording);
            queue.add(() => {
                return new Promise((resolve, reject) => {
                    setURL(recording.url);
                    recodingRef.current = recording;
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
        <div>
            { showMessage &&
                <div className="live-player-status">
                    {queueSize === 0
                        ? "Please wait..."
                        : `${queueSize} new message(s). Press play to stream.`}
                </div>}
            { recodingRef.current &&
                <div className="live-player-bottom">
                    CID: {recodingRef.current.cid} Usage Marker: {recodingRef.current.usageMarker}
                </div>
            }
            <Player height={80} url={url} onFinish={handleOnFinish} onPlayPause={handlePlayPause}></Player>
        </div>
    );
};
