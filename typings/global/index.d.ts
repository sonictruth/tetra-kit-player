
declare module '*.svg' {
    const content: any;
    export default content;
}

declare interface Recording {
    ts: number;
    size: number,
    cid: number,
    usageMarker: number,
    url: string,
}

declare interface SimpleRecording {
    ts: number;
    size: number,
    url: string,
}

declare interface KeyValue {
    [key: string]: any;
}
