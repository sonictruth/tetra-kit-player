import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button, Tooltip, Row, Col } from "antd";
import {
    CaretRightOutlined,
    PauseOutlined,
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
                backgroundColor: "white",
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
        var fileName = props.url.split('\/').pop().split(".raw.done")[0] + ".wav";
        getRawAsWavBlob(props.url).then((newBlob) => {
            var url = window.URL.createObjectURL(newBlob);
            var link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            link.click();
        });        
    };
    return (
        <>
            <div className="player" style={{borderRadius: props.height}}>
                <Row align="middle">
                    <Col flex="30px">
                        <Tooltip title={isPlaying ? "Stop" : "Play"}>
                            <Button
                                size="large"
                                style={{height: props.height, width:  props.height}}
                                onClick={() => handlePlayPause()}
                                shape="circle"
                                icon={
                                    isPlaying ? <PauseOutlined /> : <CaretRightOutlined />
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
                                size="large"
                                style={{height: props.height, width:  props.height}}
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
