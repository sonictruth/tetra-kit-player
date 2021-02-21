import React from "react";

import { timestampToDate, sizeToSeconds } from "./utils";

import {
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import "./Chart.css";

import { useHistoryStore } from "./stores";

export default () => {
    const recordings = useHistoryStore((state) => state.recordings);

    return (
        <div className="chart-container">
            {recordings.length === 0 &&
                <div>Waitting for data...</div>
            }
            {recordings.length > 0 &&
                <ResponsiveContainer className="chart" width="100%" height={520}>
                    <AreaChart data={recordings}>
                        <defs>
                            <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#001628" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#001628" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="size"
                            stroke="#8884d8"
                            fillOpacity={1}
                            fill="url(#colorSize)"
                        />
                        <CartesianGrid strokeDasharray="5 5" stroke="#ccc" />
                        <XAxis
                            dataKey="ts"
                            tickFormatter={(ts) => timestampToDate(ts).time}
                        />
                        <YAxis dataKey="size" tickFormatter={(size) => sizeToSeconds(size)} />
                        <Tooltip
                            formatter={(size) => sizeToSeconds(size)}
                            labelFormatter={(ts) =>
                                `Time:  ${timestampToDate(ts).time} ${timestampToDate(ts).time}`
                            }
                        />
                    </AreaChart>
                </ResponsiveContainer>
            }
        </div>
    );
};
