import * as Bundler from 'parcel-bundler';
import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import * as localtunnel from 'localtunnel';

import {
    tetraKitRawPath,
    webAudioPathPrefix,
    isDev,
    username,
    password,
    isSecure,
    privateCaPath,
    privateKeyPath,
    serverPort,
    isPublic,
} from './settings';

export default (serverReadyCallback: (app: express.Express, io: SocketIOServer) => void): void => {

    const app = express();

    const bundler = new Bundler('./client/index.html', {
        hmr: isDev
    });

    const users: KeyValue = {};
    users[username] = password;

    app.use(basicAuth({
        users,
        challenge: true,
    }));

    app.use(webAudioPathPrefix, express.static(tetraKitRawPath));
    app.use(bundler.middleware());

    let httpServer: http.Server;

    if (isSecure) {
        try {
            const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            const certificate = fs.readFileSync(privateCaPath, 'utf8');
            const credentials = { key: privateKey, cert: certificate };
            httpServer = https.createServer(credentials, app);
        } catch (error) {
            console.error(error, 'Make sure that you generated the server certificates using generate-cert.sh');
            process.exit(1);
        }
    } else {
        httpServer = http.createServer(app);
    }

    if (isPublic && serverPort) {
        localtunnel({
            port: parseInt(serverPort),
            allow_invalid_cert: true,
            local_key: privateKeyPath,
            local_ca: privateCaPath,
            local_https: isSecure,
        })
            .then((tunnel: any) => {
                console.log(`Public URL ready: ${tunnel.url}`);
            });
    }

    const io = new SocketIOServer(httpServer);

    httpServer.listen(serverPort, () => {
        const port = (<any>httpServer.address()).port;
        const type = isSecure ? 'https://' : 'http://';
        console.log(`Server started: ${type}localhost:${port}`);
        serverReadyCallback(app, io);
    });
}
