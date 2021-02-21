import React from "react";

import { Layout, Row, Col } from "antd";

const { Header, Footer, Content } = Layout;

import History from "./History";
import LivePlayer from "./LivePlayer";
import Chart from "./Chart";

import CmceLog from "./CmceLog";

import logo from "./logo.svg";

import "./App.css";

export default () => {
    return (
        <>
            <Layout className="App">
                <Header>
                    <Row align="middle">
                        <Col flex="30px">
                            <img className="logo" src={logo} />
                        </Col>
                        <Col flex="auto">
                            <div className="title">TETRA KIT Player</div>
                        </Col>
                        <Col flex="330px">
                            <div style={{ textAlign: "right", color: "white" }}>
                                <CmceLog />
                            </div>
                        </Col>
                    </Row>
                </Header>
                <Content >
                    <Row >
                        <Col xs={24} className="main-col">
                            <LivePlayer />
                        </Col>
                        <Col xs={24} className="main-col">
                            <History />
                        </Col>
                       
                    </Row>
                </Content>
                <Footer>&copy; CopyLeft 2021</Footer>
            </Layout>
        </>
    );
};
