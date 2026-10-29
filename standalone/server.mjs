import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,extname,sep} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR?resolve(process.env.DATA_DIR):resolve(root,'data');mkdirSync(dataDir,{recursive:true});
const sqlite=new DatabaseSync(resolve(dataDir,'answers.sqlite'),{timeout:5000});sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
for(const file of JSON.parse(readFileSync(resolve(root,'drizzle/journal.json'),'utf8'))){if(!sqlite.prepare('SELECT name FROM _migrations WHERE name=?').get(file)){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(resolve(root,'drizzle',file),'utf8'));sqlite.prepare('INSERT INTO _migrations VALUES (?)').run(file);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}}
const localKeyFile=resolve(dataDir,'host-key.txt');let hostKey=process.env.HOST_SETUP_KEY||'';if(!hostKey){if(existsSync(localKeyFile))hostKey=readFileSync(localKeyFile,'utf8').trim();else{hostKey=randomBytes(24).toString('hex');writeFileSync(localKeyFile,hostKey,{mode:0o600});}}
const DB={
 prepare(sql){let params=[];const stmt=sqlite.prepare(sql);return {bind(...args){params=args;return this;},async first(){return stmt.get(...params)||null;},async all(){return {results:stmt.all(...params)};},_run(){const r=stmt.run(...params);return {meta:{changes:Number(r.changes)}};},async run(){return this._run();}};},
 async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s._run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}
};
globalThis.__DUXING_ENV={DB,HOST_SETUP_KEY:hostKey};const api=await import('./api.mjs');
function cleanup(){sqlite.prepare('DELETE FROM rooms WHERE expires_at<=?').run(Date.now());}cleanup();const interval=setInterval(cleanup,6*3600000);interval.unref();
const port=Number(process.env.PORT||3020),bind=process.env.BIND_HOST||'0.0.0.0';
const addresses=Object.entries(networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(x=>x.family==='IPv4'&&!x.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address)).map(x=>({name,ip:x.address}))).sort((a,b)=>Number(/Wi-Fi|WLAN|无线/i.test(b.name))-Number(/Wi-Fi|WLAN|无线/i.test(a.name)));
const publicOrigin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:null;
const mainAddress=publicOrigin||`http://${addresses[0]?.ip||'127.0.0.1'}:${port}`;
writeFileSync(resolve(dataDir,'主持说明.txt'),`笃行班 · 私密主持入口\n\n${publicOrigin?'云端主持入口':'教室网络主持入口'}：${mainAddress}/?view=host\n主持口令：${hostKey}\n\n先创建房间，再点击“保存私密入口”和“打开投影页”。同学扫码无需姓名和口令。\n${publicOrigin?'云端运行，无需同学与主持电脑连接同一Wi-Fi。':'电脑与手机需连接同一网络，并允许设备互访；不要用localhost生成手机二维码。'}\n本机预览：http://127.0.0.1:${port}\n\n口令及此文件不要上传GitHub或放入PPT。\n`,{mode:0o600});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/',publicOrigin||`http://${req.headers.host||'localhost'}`);
 if(u.pathname==='/api/game'){
  if(req.method!=='GET'&&req.method!=='POST'){res.writeHead(405);res.end();return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024){res.writeHead(413,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'单次请求过大，请分次分享'}));return;}chunks.push(chunk);}
  const body=Buffer.concat(chunks).toString('utf8');
  const response=await(req.method==='GET'?api.GET:api.POST)(new Request(u,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 const pathname=decodeURIComponent(u.pathname),target=resolve(root,'.'+pathname);
 if(!target.startsWith(root+sep)&&target!==root){res.writeHead(403);res.end();return;}
 if(pathname!=='/'&&pathname!=='/offline.html'&&!pathname.startsWith('/assets/')){res.writeHead(404);res.end();return;}
 const file=pathname==='/'?resolve(root,'index.html'):target;
 if(!existsSync(file)){res.writeHead(404);res.end();return;}
 const bytes=readFileSync(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){res.writeHead(500,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'服务暂时未能完成请求，请重试'}));console.error(e.message);}});
server.listen(port,bind,()=>{console.log('\n笃行班多人游戏 v0.6.1 已启动。\n');console.log(publicOrigin?'云端模式：无需同一Wi-Fi。':'局域网模式：电脑与同学手机需连接同一网络。');console.log('主持入口：'+mainAddress+'/?view=host');console.log('本机预览：http://127.0.0.1:'+port);console.log('私密主持说明：'+resolve(dataDir,'主持说明.txt'));console.log('手动运行时保持窗口打开；后台服务由系统自动管理。\n');});
function shutdown(){clearInterval(interval);server.close(()=>{sqlite.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
