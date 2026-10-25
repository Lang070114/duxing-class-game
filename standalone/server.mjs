import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,extname,sep} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));const dataDir=process.env.DATA_DIR?resolve(process.env.DATA_DIR):resolve(root,'data');mkdirSync(dataDir,{recursive:true});
const sqlite=new DatabaseSync(resolve(dataDir,'answers.sqlite'),{timeout:5000});sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
for(const file of JSON.parse(readFileSync(resolve(root,'drizzle/journal.json'),'utf8'))){if(!sqlite.prepare('SELECT name FROM _migrations WHERE name=?').get(file)){sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(resolve(root,'drizzle',file),'utf8'));sqlite.prepare('INSERT INTO _migrations VALUES (?)').run(file);sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e;}}}
const localKeyFile=resolve(dataDir,'host-key.txt');let hostKey=process.env.HOST_SETUP_KEY||'';if(!hostKey){if(existsSync(localKeyFile))hostKey=readFileSync(localKeyFile,'utf8').trim();else{hostKey=randomBytes(24).toString('hex');writeFileSync(localKeyFile,hostKey,{mode:0o600})}}
const DB = {
  prepare(sql) {
    let params = [];
    const statement = sqlite.prepare(sql);
    return {
      bind(...args) { params = args; return this; },
      async first() { return statement.get(...params) || null; },
      async all() { return { results: statement.all(...params) }; },
      async run() { const r = statement.run(...params); return { meta: { changes: Number(r.changes) } }; },
    };
  },
};
globalThis.__DUXING_ENV={DB,HOST_SETUP_KEY:hostKey};const api=await import('./api.mjs');
function cleanup(){sqlite.prepare('DELETE FROM rooms WHERE expires_at<=?').run(Date.now())}cleanup();const interval=setInterval(cleanup,6*3600000);interval.unref();
const port=Number(process.env.PORT||3020);const addresses=Object.entries(networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(x=>x.family==='IPv4'&&!x.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address)).map(x=>({name,ip:x.address}))).sort((a,b)=>Number(/Wi-Fi|WLAN|无线/i.test(b.name))-Number(/Wi-Fi|WLAN|无线/i.test(a.name)));
const mainAddress=process.env.PUBLIC_ORIGIN||`http://${addresses[0]?.ip||'127.0.0.1'}:${port}`;
writeFileSync(resolve(dataDir,'主持说明.txt'),`笃行班 · 私密主持入口\n\n教室同一Wi-Fi请使用：${mainAddress}/?view=host\n主持口令：${hostKey}\n\n先创建房间，再打开独立投影页。扫码地址根据浏览器地址生成；请使用上面的教室网络地址，不要用localhost地址生成手机二维码。\n\n本机预览：http://127.0.0.1:${port}\n\n其他可能的教室网络地址：\n${addresses.map(x=>`${x.name}: http://${x.ip}:${port}`).join('\n')}\n`,{mode:0o600});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(u.pathname==='/api/game'){
 let body='';for await(const chunk of req){body+=chunk;if(body.length>8000){res.writeHead(413);res.end('Too large');return}}
 const response=await (req.method==='GET'?api.GET:api.POST)(new Request(u,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
 const pathname=decodeURIComponent(u.pathname);const target=resolve(root,'.'+pathname);if(!target.startsWith(root+sep)&&target!==root){res.writeHead(403);res.end();return}
 if(pathname!=='/'&&pathname!=='/offline.html'&&!pathname.startsWith('/assets/')){res.writeHead(404);res.end();return}
 const file=pathname==='/'?resolve(root,'index.html'):target;const bytes=readFileSync(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'服务暂时未能完成请求，请重试'}));console.error(e.message)}});
server.listen(port,process.env.BIND_HOST||'0.0.0.0',()=>{console.log('\n笃行班多人游戏已启动。\n');console.log('电脑与同学手机请连接同一个教室Wi-Fi。');console.log('主持入口：'+mainAddress+'/?view=host');console.log('本机预览：http://127.0.0.1:'+port);console.log('私密主持口令与所有可选网络地址：'+resolve(dataDir,'主持说明.txt'));console.log('此窗口保持打开。按Ctrl+C停止。\n')});
process.on('SIGINT',()=>server.close(()=>{sqlite.close();process.exit(0)}));
