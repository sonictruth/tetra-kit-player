import React, {
    useState,
    useEffect,
} from "react";
import { ColumnsType } from "antd/es/table";
import {
    getNumberColor,
    timestampToDate,
    sizeToSeconds,
} from "./utils";
import {
    Table,
    Input,
    Button,
    Space,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Player from "./Player";
import NumberAvatar from "./NumberAvatar";

import { useHistoryStore } from "./stores";



const columns: ColumnsType<Recording> = [
    {
        title: "Time",
        dataIndex: "ts",
        render: (ts: number) => <><pre>{timestampToDate(ts).date}<br />{timestampToDate(ts).time}</pre></>,
        sorter: {
            compare: (a, b) => a.ts - b.ts,
        },
    },
    {
        title: "Duration",
        dataIndex: "size",
        render: (value: number) => sizeToSeconds(value),
        sorter: {
            compare: (a, b) => a.size - b.size,
        },
    },
    {
        title: "CID",
        dataIndex: "cid",
        sorter: {
            compare: (a, b) => a.cid - b.cid,
        },
        render: (cid) => <NumberAvatar number={cid} />,
    },
    {
        title: "Marker",
        dataIndex: "usageMarker",
        sorter: {
            compare: (a, b) => a.usageMarker - b.usageMarker,
        },
        render: (marker) => <NumberAvatar number={marker} />,
    },
    {
        title: "Audio",
        width: "30%",
        dataIndex: "url",
        render: (url) => <Player height={40} url={url} />,
    },
];

export default () => {
    const [searchText, setSearchText] = useState<string>();
    const [searchedColumn, setSearchedColumn] = useState<string>();
    const loadHistory = useHistoryStore(state => state.load);
    const add = useHistoryStore(state => state.add);
    const recordings = useHistoryStore(state => state.recordings);
  
    useEffect(() => {
        loadHistory();
    }, []);


    function handleSearch(selectedKeys, confirm, dataIndex) {
        confirm();
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    }

    function handleReset(clearFilters) {
        clearFilters();
        setSearchText("");
    }

    function getColumnSearchProps(dataIndex) {
        return {
            filterDropdown: ({
                setSelectedKeys,
                selectedKeys,
                confirm,
                clearFilters,
            }) => (
                <div style={{ padding: 8 }}>
                    <Input
                        placeholder={`Search ${dataIndex}`}
                        value={selectedKeys[0]}
                        onChange={(e) =>
                            setSelectedKeys(e.target.value ? [e.target.value] : [])
                        }
                        onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                            icon={<SearchOutlined />}
                            size="small"
                            style={{ width: 90 }}
                        >
                            Search
            </Button>
                        <Button
                            onClick={() => handleReset(clearFilters)}
                            size="small"
                            style={{ width: 90 }}
                        >
                            Reset
            </Button>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => {
                                confirm({ closeDropdown: false });
                                setSearchText(selectedKeys[0]);
                                setSearchedColumn(dataIndex);
                            }}
                        >
                            Filter
            </Button>
                    </Space>
                </div>
            ),
            filterIcon: (filtered) => (
                <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
            ),
            onFilter: (value, record) =>
                record[dataIndex]
                    ? record[dataIndex]
                        .toString()
                        .toLowerCase()
                        .includes(value.toLowerCase())
                    : "",
        };
    }
    columns[2] = {
        ...columns[2],
        ...getColumnSearchProps("cid"),
    };
    columns[3] = {
        ...columns[3],
        ...getColumnSearchProps("usageMarker"),
    };
    return (
        <>
            <Table<Recording>
                pagination={{ position: [ "bottomRight"], pageSize: 5 }}
                rowKey="ts"
                columns={columns}
                dataSource={recordings}
            />
        </>
    );
};
