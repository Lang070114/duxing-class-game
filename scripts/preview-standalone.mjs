import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const child=spawn(process.execPath,['--disable-warning=ExperimentalWarning','standalone-dist/server.mjs'],{env:{...process.env,PORT:'3031',BIND_HOST:'127.0.0.1',DATA_DIR:resolve('work/visual-preview'),PUBLIC_ORIGIN:'http://127.0.0.1:3031'},stdio:'inherit'});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());child.on('exit',code=>process.exit(code||0));
