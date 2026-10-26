import {env} from 'cloudflare:workers';
import {STAGES,validatePayload,MAX_REQUEST_BYTES,type Payload} from '@/lib/game';
import * as legacy from './legacy-core';
export const dynamic='force-dynamic';
type Room={code:string;host_hash:string;screen_hash:string;stage:number;phase:string;revision:number;deadline:number|null;remaining:number|null;game_end:number|null;expires_at:number;rules_version:number;is_demo:number;round:number};
type Answer={id:string;player:string;stage:number;payload:string;hidden:number;submitted_at:number};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const db=()=>{if(!env.DB)throw new Error('数据库尚未配置');return env.DB;};
async function roomFor(code:string){if(!/^\d{6}$/.test(code))throw new Error('请输入6位房间码');const r=await db().prepare('SELECT * FROM rooms WHERE code=?').bind(code).first<Room>();if(!r||r.expires_at<=Date.now())throw new Error('房间不存在或已过保存期');return r;}
async function identity(req:Request,r:Room){const raw=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';if(raw.length<20||raw.length>200)throw new Error('请重新加入房间');const hash=await digest(raw);if(hash===r.host_hash)return {role:'host',id:''};if(hash===r.screen_hash)return {role:'screen',id:''};const p=await db().prepare('SELECT id FROM players WHERE room=? AND token_hash=?').bind(r.code,hash).first<{id:string}>();if(!p)throw new Error('参与凭证无效，请重新加入房间');return {role:'player',id:p.id};}
async function state(req:Request,code:string){
 const r=await roomFor(code);const who=await identity(req,r);
 const [all,count]=await Promise.all([db().prepare('SELECT * FROM answers WHERE room=? ORDER BY submitted_at,id').bind(code).all<Answer>(),db().prepare('SELECT COUNT(*) AS n FROM players WHERE room=?').bind(code).first<{n:number}>()]);
 const counts:Record<string,number>={},totals:Record<string,number[]>={'3':[0,0,0,0],'4':[0,0,0,0],'6':[0,0,0,0]},mine:Record<string,Payload>={};
 for(const a of all.results){counts[a.stage]=(counts[a.stage]||0)+1;const p:Payload=JSON.parse(a.payload);if(a.player===who.id)mine[a.stage]=p;if(a.stage===3)totals['3'][p.status!]++;if(a.stage===4)p.picks!.forEach(i=>totals['4'][i]++);if(a.stage===6)totals['6'][p.choice!]++;}
 const cards=all.results.filter(a=>[1,2,3,5].includes(a.stage)&&(who.role==='host'||!a.hidden)).map(a=>{const p:Payload=JSON.parse(a.payload);return {id:a.id,stage:a.stage,payload:a.stage===3?{text:p.text,kind:p.kind}:p,hidden:a.hidden,submittedAt:a.submitted_at};});
 return {rulesVersion:r.rules_version,demo:!!r.is_demo,round:r.round,code,stage:r.stage,phase:r.phase,revision:r.revision,deadline:r.deadline,gameEnd:r.game_end,expiresAt:r.expires_at,serverNow:Date.now(),players:count?.n||0,role:who.role,counts,totals,cards,mine};
}
export async function GET(req:Request){try{const code=new URL(req.url).searchParams.get('room')||'';const r=await roomFor(code);if(r.rules_version===1){const response=await legacy.GET(req);return json({...(await response.json() as Record<string,unknown>),rulesVersion:1,round:0,demo:false},response.status);}return json(await state(req,code));}catch(e){return json({error:e instanceof Error?e.message:'读取失败，请重试'},400);}}
function demoPayload(stage:number,i:number):Payload{
 if(stage===1)return {text:['从不敢开口到一起唱响，原来我们真的能做到。','排练时总说再来一次，上台后只想再来一次。','不是每个人都唱得完美，但每个人都在认真发光。','记住的不是名次，是一起练到很晚的队友。','百歌已通关，合唱技能永久保留。','一群人的声音，真的比一个人的勇气更大。'][i]};
 if(stage===2)return {shop:['东园小馆','东园小馆','校园饭堂','校园饭堂','巷口面馆','巷口面馆'][i],dish:['番茄鸡蛋饭','番茄鸡蛋饭','双拼饭','双拼饭','牛肉面','拌面'][i]};
 if(stage===3)return {kind:i%3,text:['新增主动找队友讨论的功能','修复一个人闷头赶作业的习惯','BUG：待办清单比睡眠还长','新增探索实习与竞赛的地图','修复遇到问题不敢提问的BUG','主线任务加载中，先保持好奇'][i],status:i%4};
 if(stage===4)return {picks:[[0,1],[0,3],[1,2],[0,1],[0,2],[1,3]][i]};
 if(stage===5)return {text:['DDL前能召唤一位答疑搭子','让每一个想参加活动的人都能找到队友','自动收集靠谱的成长情报','把大家的建议变成有回应的小事','一键发现谁也想去运动','将一份资料共享成全班的底气'][i]};
 return {choice:[0,1,0,1,2,3][i]};
}
export async function POST(req:Request){try{
 const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'请求来源不匹配'},403);
 if(Number(req.headers.get('Content-Length')||0)>MAX_REQUEST_BYTES)return json({error:'单次请求过大，请分次分享'},413);
 const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>MAX_REQUEST_BYTES)return json({error:'单次请求过大，请分次分享'},413);
 const b=JSON.parse(raw),now=Date.now();
 if(b.action==='cleanup'){const result=await db().prepare('DELETE FROM rooms WHERE expires_at<=?').bind(now).run();return json({deleted:result.meta.changes});}
 if(b.action==='create'){
  const secret=(env as unknown as {HOST_SETUP_KEY?:string}).HOST_SETUP_KEY;
  if(!secret||await digest(req.headers.get('X-Host-Key')||'')!==await digest(secret))return json({error:'主持口令不正确'},403);
  if((await db().prepare('SELECT COUNT(*) AS n FROM rooms WHERE expires_at>?').bind(now).first<{n:number}>())!.n>=30)throw new Error('有效房间数量已达上限，请复用已有房间');
  const host=token(),screen=token();for(let i=0;i<10;i++){const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const result=await db().prepare('INSERT OR IGNORE INTO rooms(code,host_hash,screen_hash,created_at,expires_at,rules_version,is_demo) VALUES(?,?,?,?,?,2,?)').bind(code,await digest(host),await digest(screen),now,now+7*86400000,b.demo===true?1:0).run();if(result.meta.changes)return json({code,host,screen});}throw new Error('生成房间码失败，请重试');
 }
 const r=await roomFor(String(b.code||''));
 if(r.rules_version===1)return legacy.POST(new Request(req.url,{method:'POST',headers:req.headers,body:raw}));
 if(b.action==='join'){
  if(r.stage===7)throw new Error('本场已结束，不能再加入');const id=crypto.randomUUID(),credential=token();const result=await db().prepare('INSERT INTO players(id,room,token_hash,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM players WHERE room=?)<80').bind(id,r.code,await digest(credential),now,r.code).run();if(!result.meta.changes)throw new Error('房间人数已满，请联系主持人');return json({token:credential,id});
 }
 const who=await identity(req,r);
 if(b.action==='answer'){
  if(who.role!=='player')return json({error:'只有同学端可以提交答案'},403);
  if(b.round!==r.round||b.stage!==r.stage||r.phase!=='open')throw new Error('本轮已停止收集或已重置，请等待页面同步');
  const payload=validatePayload(r.stage,b.payload);
  const result=await db().prepare(`INSERT INTO answers(id,room,player,stage,payload,submitted_at)
   SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE code=? AND stage=? AND phase='open' AND round=?)
   ON CONFLICT(room,player,stage) DO UPDATE SET payload=excluded.payload,submitted_at=excluded.submitted_at`).bind(crypto.randomUUID(),r.code,who.id,r.stage,JSON.stringify(payload),now,r.code,r.stage,r.round).run();
  if(!result.meta.changes)throw new Error('本轮已停止收集');return json({saved:true,state:await state(req,r.code)});
 }
 if(who.role!=='host')return json({error:'仅主持人可以操作'},403);
 if(b.action==='export'){const rows=await db().prepare('SELECT player,stage,payload,hidden,submitted_at FROM answers WHERE room=? ORDER BY stage,submitted_at').bind(r.code).all();return json({room:r.code,rulesVersion:2,demo:!!r.is_demo,round:r.round,exportedAt:new Date().toISOString(),expiresAt:r.expires_at,answers:rows.results});}
 if(b.action==='hide'){await db().prepare('UPDATE answers SET hidden=? WHERE room=? AND id=?').bind(b.hidden?1:0,r.code,String(b.id)).run();return json(await state(req,r.code));}
 if(b.action==='seed'){
  if(!r.is_demo)return json({error:'正式房间不能添加演示数据'},403);
  if(r.phase!=='open'||r.stage<1||r.stage>6)throw new Error('请先开始本关收集');
  for(let i=0;i<6;i++){const id=`demo-${r.code}-${i}`;await db().prepare('INSERT OR IGNORE INTO players(id,room,token_hash,created_at) VALUES(?,?,?,?)').bind(id,r.code,await digest(token()),now).run();const payload=validatePayload(r.stage,demoPayload(r.stage,i));await db().prepare(`INSERT INTO answers(id,room,player,stage,payload,submitted_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE code=? AND stage=? AND phase='open' AND round=?) ON CONFLICT(room,player,stage) DO NOTHING`).bind(crypto.randomUUID(),r.code,id,r.stage,JSON.stringify(payload),now+i,r.code,r.stage,r.round).run();}
  return json(await state(req,r.code));
 }
 if(b.action==='control'){
  if(b.revision!==r.revision)return json({error:'状态已更新，请再操作一次'},409);
  if(b.command==='reset'){
   const result=await db().batch([db().prepare('DELETE FROM answers WHERE room=? AND EXISTS(SELECT 1 FROM rooms WHERE code=? AND revision=?)').bind(r.code,r.code,r.revision),db().prepare(`UPDATE rooms SET stage=0,phase='open',deadline=NULL,remaining=NULL,game_end=NULL,round=round+1,revision=revision+1 WHERE code=? AND revision=?`).bind(r.code,r.revision)]);
   if(!result[1].meta.changes)return json({error:'状态已更新，请再操作一次'},409);return json(await state(req,r.code));
  }
  let stage=r.stage,phase=r.phase,deadline=r.deadline,remaining=r.remaining;
  if(b.command==='next'&&stage<7&&(stage===0||phase==='revealed')){stage++;phase=stage===7?'revealed':'ready';deadline=null;remaining=null;}
  else if(b.command==='start'&&stage>0&&stage<7&&(phase==='ready'||phase==='closed'||phase==='revealed')){phase='open';deadline=now+STAGES[stage].seconds*1000;}
  else if(b.command==='close'&&stage>0&&stage<7&&(phase==='open'||phase==='paused')){phase='closed';deadline=null;remaining=null;}
  else if(b.command==='reveal'&&stage>0&&stage<7&&(phase==='closed'||phase==='open'||phase==='paused')){phase='revealed';deadline=null;remaining=null;}
  else if(b.command==='pause'&&phase==='open'){remaining=Math.max(0,(deadline||now)-now);deadline=null;phase='paused';}
  else if(b.command==='resume'&&phase==='paused'){deadline=now+(remaining||30000);phase='open';}
  else if(b.command==='extend'&&phase==='open'){deadline=Math.max(now,deadline||now)+30000;}
  else if(b.command==='handoff'&&stage===7){phase='handoff';}
  else if(b.command==='report'&&stage===7){phase='revealed';}
  else if(b.command==='finish'){stage=7;phase='revealed';deadline=null;}
  else throw new Error('请先结束收集并揭晓结果，再进入下一关');
  const expiry=stage===7&&r.stage!==7?now+7*86400000:r.expires_at;
  const result=await db().prepare('UPDATE rooms SET stage=?,phase=?,deadline=?,remaining=?,expires_at=?,revision=revision+1 WHERE code=? AND revision=?').bind(stage,phase,deadline,remaining,expiry,r.code,r.revision).run();
  if(!result.meta.changes)return json({error:'操作冲突，请重试'},409);return json(await state(req,r.code));
 }
 throw new Error('未知操作');
 }catch(e){return json({error:e instanceof Error?e.message:'请求失败，请重试'},400);}}
