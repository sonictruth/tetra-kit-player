import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let WASI: any;
try {
    const wasiModule = require('wasi');
    WASI = wasiModule.WASI;
} catch (e) {
    console.error('WASI not avalible. Please upgrade node.')
}
interface ModulesHasMap { [name: string]: WebAssembly.Module };
let compiledModules: ModulesHasMap = {}

const moduleNames = ['sdecoder', 'cdecoder'];
const modulePath = `./server/decoder/`;

let compiled = false;

const defaultWasiOptions:any = {
    preopens: {
        '/tmp': os.tmpdir()
    },
    args: ['prog'],
    env: {},
    returnOnExit: true,
};

const compile = async (path: string): Promise<WebAssembly.Module> => {
    return await WebAssembly.compile(
        fs.readFileSync(path)
    );
}

const compileAll = async () => {
    await Promise.all(moduleNames.map(async (moduleName) => {
        compiledModules[moduleName] = await compile(`${modulePath}${moduleName}.wasm`);
    }));
}

export const run = async (
    moduleName: ('sdecoder' | 'cdecoder'),
    workDir: string,
    infile: string,
    outfile: string
): Promise<string> => {
    const out = ''; // TODO: output, untill then it goes to stdout,stderr
    const module = compiledModules[moduleName];
    const wasiOptions = {
        ...defaultWasiOptions,
        args: [moduleName, infile, outfile]
    };
    wasiOptions.preopens[workDir] = workDir;
    let wasi = new WASI(wasiOptions);
    const importObject = { wasi_snapshot_preview1: wasi.wasiImport };
    let instance = await WebAssembly.instantiate(module, {
        ...importObject
    });

    const returnCode =  wasi.start(instance);
    if(returnCode > 0) {
        throw 'Error decoding';
    }
    return out;
}

export default async (inFilePath: string, outExtension: string) => {
    if (!WASI) {
        throw 'WASI required.'
    }
    if (!compiled) {
        await compileAll();
        compiled = true;
    };
    const resolvedInFilePath = path.resolve(inFilePath);
    const workDir = path.dirname(resolvedInFilePath);
    const inFileName = path.basename(resolvedInFilePath);
    const tmpFileName = `/tmp/${inFileName}`;
    if (!fs.existsSync(resolvedInFilePath)) {
        throw `File not found: ${resolvedInFilePath}`;
    }
    run('cdecoder', workDir, resolvedInFilePath, tmpFileName);
    run('sdecoder', workDir, tmpFileName, resolvedInFilePath + outExtension);
};
