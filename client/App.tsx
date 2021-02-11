import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

import {
    Layout,
    Row,
    Col
} from 'antd';

const {
    Header,
    Footer,
    Content,
} = Layout;

import History from './History';

import { convertSimpleRecordings } from './utils';

import logo from './logo.svg';

import './App.css';

const socket = io(location.origin);

socket.on('connect', () => console.log('Connected...'));
socket.on('disconnect', () => console.error('Disconnected. Try reloading the page.'));
socket.on('init', () => console.log('Waiting for new messages...'));

socket.on('message', message => console.log(message));
socket.on('newfile', fileName => console.log(fileName));

export default () => {
    const [recordings, setRecordings] = useState([]);
    useEffect(() => {
        socket.emit('getHistory', (simpleRecordings: SimpleRecording[]) => {
            const newRecordings = convertSimpleRecordings(simpleRecordings);
            setRecordings(newRecordings);
            setTimeout(() => {
                setRecordings([{
                    ts: 2,
                    size: 3332,
                    cid: 3331,
                    usageMarker: 1,
                    url: 1,
                }, ...newRecordings]);
            }, 3000)
        });
    }, []);
    return <>
        <Layout className="App">
            <Header>
                <Row align="middle">
                    <Col flex="30px">
                        <img className="logo" src={logo} />
                    </Col>
                    <Col flex="auto">
                        <div className="title">TETRA KIT Player</div>
                    </Col>
                </Row>
            </Header>
            <Content>

                <div className="site-layout-content">
                    <History recordings={recordings} />
                </div>

            </Content>
            <Footer>&copy; CopyLeft 2021</Footer>
        </Layout>
    </>;

}
