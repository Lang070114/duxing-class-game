import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const stage=resolve('work/release-v0.5.0'),portable=join(stage,'portable-game');
mkdirSync(portable,{recursive:true});
for(const name of ['api.mjs','server.mjs','index.html','offline.html','启动笃行班游戏.cmd','使用说明.txt'])copyFileSync(join('standalone-dist',name),join(portable,name));
for(const dir of ['assets','drizzle']){mkdirSync(join(portable,dir),{recursive:true});for(const name of readdirSync(join('standalone-dist',dir)))copyFileSync(join('standalone-dist',dir,name),join(portable,dir,name));}
writeFileSync(join(stage,'update-tencent.sh'),readFileSync('scripts/update-tencent.sh','utf8').replaceAll('\r\n','\n'));
copyFileSync('docs/本次更新-v0.5.0.md',join(stage,'使用与升级说明.md'));
copyFileSync('docs/主持流程.md',join(stage,'班会主持流程.md'));
const unexpected=[];function inspect(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(item.name==='data'||/host-key|answers\.sqlite|私密主持|test-room|live-room/.test(item.name))unexpected.push(join(dir,item.name));if(item.isDirectory())inspect(join(dir,item.name));}}inspect(stage);if(unexpected.length)throw new Error('Release contains private runtime data: '+unexpected.join(','));
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
writeFileSync(join(stage,'version.json'),JSON.stringify({version:'0.5.0',commit,sourceRepository:'https://github.com/Lang070114/duxing-class-game',checks:JSON.parse(readFileSync('work/test-results.json','utf8')),containsPrivateData:false},null,2));
console.log('Release staging ready: work/release-v0.5.0 (runtime data and secrets excluded).');
