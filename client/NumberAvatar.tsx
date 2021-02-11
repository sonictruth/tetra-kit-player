import React, {
    useState,
    useEffect,
} from "react";
import {
    getNumberColor,
    invertColor,
} from "./utils";
import {
    Avatar,
} from "antd";

import "./NumberAvatar.css";

export default (props: { number: number }) => {
   const backgroundColor = getNumberColor(props.number);
   const color = invertColor(backgroundColor, true);
   return <Avatar
        className="number-avatar"
        style={{
            backgroundColor,
            color,
            verticalAlign: "middle",
        }}
        size="large"
        gap={4}>
        {props.number}
    </Avatar>
}
