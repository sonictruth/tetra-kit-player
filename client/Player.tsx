import React, { 
    useState, 
    useEffect, 
    useRef
} from "react";
import WaveSurfer from "wavesurfer.js";
import { 
    Button,
    Tooltip,
    Row,
    Col
} from "antd";
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    CloudDownloadOutlined,
} from "@ant-design/icons";

import { getRawAsWavBlob } from "./utils";

import "./Player.css";

export default (props: { url: string }) => {
    const waveSurferDivRef = useRef<HTMLDivElement>();
    const waveSurferRef = useRef(null);
    const blob = useRef<Blob>();
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    useEffect(() => {
        if (waveSurferDivRef.current) {
            waveSurferRef.current = WaveSurfer.create({
                height: 30,
                backgroundColor: "#fafafa",
                container: waveSurferDivRef.current,
            });
            return () => { 
                waveSurferRef.current.destroy()
            };
        }
    }, [props.url]);
    const handlePlayPause = () => {
        if (!blob.current) {
            getRawAsWavBlob(props.url)
                .then(newBlob => {
                    blob.current = newBlob;
                    waveSurferRef.current.loadBlob(blob.current);
                    waveSurferRef.current.once('ready', () => waveSurferRef.current.play());
                    waveSurferRef.current.on('play', () => setIsPlaying(true));
                    waveSurferRef.current.on('pause', () => setIsPlaying(false));
                });
        } else {
            waveSurferRef.current.playPause();
        }
    };
    const handleDownload = () => {
        window.location.href = props.url;
    };
    return (
        <>
            <div className="player">
                <Row>
                    <Col flex="30px">
                        <Tooltip title={isPlaying ? 'Stop' : 'Play'}>
                            <Button
                                onClick={() => handlePlayPause()}
                                shape="circle"
                                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
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
