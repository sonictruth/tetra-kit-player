import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button, Tooltip, Row, Col } from "antd";
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    CloudDownloadOutlined,
} from "@ant-design/icons";

import { getRawAsWavBlob } from "./utils";

import "./Player.css";

export default (props: {
    url: string;
    height: number;
    onFinish?: Function;
    onPlayPause?: Function;
}) => {

    const onPlayPause = props.onPlayPause || function () { };
    const waveSurferDivRef = useRef<HTMLDivElement>();
    const waveSurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const onFinish = props.onFinish || function () {
        setIsPlaying(false);
        waveSurferRef.current.stop();

     };
    useEffect(() => {
        if (waveSurferDivRef.current) {
            waveSurferRef.current = WaveSurfer.create({
                height: props.height,
                backgroundColor: "#fafafa",
                container: waveSurferDivRef.current,
            });
            if (props.url) {
                getRawAsWavBlob(props.url).then((newBlob) => {
                    waveSurferRef.current.loadBlob(newBlob);
                    waveSurferRef.current.on("ready", () =>
                        isPlaying ? waveSurferRef.current.play() : null
                    );
                    waveSurferRef.current.on("play", ()=> onPlayPause(true));
                    waveSurferRef.current.on("pause", ()=> onPlayPause(false));
                    waveSurferRef.current.on("finish", () => onFinish());
                    waveSurferRef.current.on("error", () => onFinish());
                }).catch( () => onFinish());
            }
            return () => {
                waveSurferRef.current.destroy();
            };
        }
    }, [props.url]);
    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
        if (waveSurferRef.current.isReady) {
            !isPlaying ? waveSurferRef.current.play() : waveSurferRef.current.pause();
        }
    };
    const handleDownload = () => {
        window.location.href = props.url;
    };
    return (
        <>
            <div className="player">
                <Row align="middle">
                    <Col flex="30px">
                        <Tooltip title={isPlaying ? "Stop" : "Play"}>
                            <Button
                                onClick={() => handlePlayPause()}
                                shape="circle"
                                icon={
                                    isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
                                }
                            />
                        </Tooltip>
                    </Col>
                    <Col flex="auto">
                        <div ref={waveSurferDivRef}></div>
                    </Col>
                    <Col flex="30px">
                        <Tooltip title="Download">
                            <Button
                                onClick={() => handleDownload()}
                                shape="circle"
                                icon={<CloudDownloadOutlined />}
                            />
                        </Tooltip>
                    </Col>
                </Row>
            </div>
        </>
    );
};
