import React, { useState, useEffect } from 'react';

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
import LivePlayer from './LivePlayer';

import logo from './logo.svg';

import './App.css';

export default () => {
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
                    <LivePlayer/>
                    <History/>
                </div>

            </Content>
            <Footer>&copy; CopyLeft 2021</Footer>
        </Layout>
    </>;

}
