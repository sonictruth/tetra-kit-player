import React, { useState, useEffect, useRef } from "react";

import { useHistoryStore } from "./stores";


export default () => {
    const socket = useHistoryStore((state) => state.socket);
    const [cmceLog, setCmceLog] = useState<any>();

    useEffect(() => {
        function cmceHandler(newCmceLog) {
            //console.log(cmceLog);
            setCmceLog(newCmceLog);
        }
        socket.on('cmceLog', cmceHandler);
        return () => {
            socket.off('cmceLog', cmceHandler);
        };
    }, []);

    return (
        <>
            {cmceLog &&
                <div>
                    <strong>{cmceLog.pdu}</strong> [TN:{cmceLog.tn} MN:{cmceLog.mn} SSI:{cmceLog.ssi}]
                </div>
            }
        </>
    );
};
