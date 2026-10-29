import {env} from 'cloudflare:workers';
import {STAGES,stageFor,validatePayload,MAX_REQUEST_BYTES,type Payload} from '@/lib/game';
import {reviewReason} from '@/lib/content-safety';
import * as legacy from './legacy-core';
export const dynamic='force-dynamic';
type Room={code:string;host_hash:string;screen_hash:string;stage:number;phase:string;revision:number;deadline:number|null;remaining:number|null;game_end:number|null;expires_at:number;rules_version:number;is_demo:number;round:number;revealed_mask:number;fallback_mask:number};
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
 const counts:Record<string,number>={},totals:Record<string,number[]>={'3':[0,0,0,0],'4':[0,0,0,0],'5':[0,0,0,0,0,0],'6':[0,0,0,0]},mine:Record<string,Payload>={};
 for(const a of all.results){counts[a.stage]=(counts[a.stage]||0)+1;const p:Payload=JSON.parse(a.payload);if(a.player===who.id)mine[a.stage]=p;if(a.stage===3&&p.status!==undefined)totals['3'][p.status]++;if(a.stage===4)p.picks?.forEach(i=>totals['4'][i]++);if(a.stage===5){if(r.rules_version>=4&&p.choice!==undefined)totals['5'][p.choice]++;else if(r.rules_version>=3)p.buddies?.forEach(i=>totals['5'][i]++);}if(a.stage===6){if(r.rules_version>=3)p.picks?.forEach(i=>totals['6'][i]++);else if(p.choice!==undefined)totals['6'][p.choice]++;}}
 const revealed=[1,2,3,4,5,6].filter(i=>!!(r.revealed_mask&(1<<i)));
 // Redact at the API boundary for every role, including a host page being projected.
 for(const key of Object.keys(totals))if(!revealed.includes(Number(key))){totals[key]=[];if(!(r.rules_version>=4&&key==='5'))delete counts[key];}
 const cards=all.results.filter(a=>[1,2,3,5].includes(a.stage)&&(who.role==='host'||a.hidden===0&&(!(r.rules_version>=4&&a.stage===5)||revealed.includes(5)))).map(a=>{const p:Payload=JSON.parse(a.payload);return {id:a.id,stage:a.stage,payload:a.stage===3||a.stage===5?{text:p.text}:p,hidden:a.hidden,submittedAt:a.submitted_at};}).filter(a=>!(r.rules_version>=4&&a.stage===5)||a.payload.text?.trim());
 return {rulesVersion:r.rules_version,revealed,fallbacks:[1,2,3,4,5,6].filter(i=>!!(r.fallback_mask&(1<<i))),demo:!!r.is_demo,round:r.round,code,stage:r.stage,phase:r.phase,revision:r.revision,deadline:r.deadline,gameEnd:r.game_end,expiresAt:r.expires_at,serverNow:Date.now(),players:r.stage===0||r.stage===7?count?.n||0:0,role:who.role,counts,totals,cards,mine};
}
export async function GET(req:Request){try{const code=new URL(req.url).searchParams.get('room')||'';const r=await roomFor(code);if(r.rules_version===1){const response=await legacy.GET(req);return json({...(await response.json() as Record<string,unknown>),rulesVersion:1,round:0,demo:false},response.status);}return json(await state(req,code));}catch(e){return json({error:e instanceof Error?e.message:'读取失败，请重试'},400);}}
function demoPayload(stage:number,i:number,version:number):Payload{
 if(stage===1)return {text:['排练完好饿，每次都想去吃点东西。','正式上台反而没排练时紧张。','最记得的是候场的时候大家一直聊天。','有一段歌词现在还会哼。','那几天跑来跑去挺累的，照片倒是拍了不少。','演完回去的路上还在聊刚才谁笑场。'][i]};
 if(stage===2)return {shop:['东园小馆','东园小馆','校园饭堂','校园饭堂','巷口面馆','巷口面馆'][i],dish:['番茄鸡蛋饭','番茄鸡蛋饭','双拼饭','双拼饭','牛肉面','拌面'][i]};
 if(stage===3)return {text:['最近总觉得时间不够用','开始自己找实习信息了，还不太确定方向','和熟悉的人一起上课挺安心','课程有点难，但也有挺喜欢的课','不想社交的时候就自己待一会儿','有点迷茫，不过没那么焦虑'][i],status:i%4};
 if(stage===4)return {picks:[[0,1],[0,3],[1,2],[0,1],[0,2],[1,3]][i]};
 if(stage===5&&version>=4)return {choice:i%6,text:['今天也在赶DDL','我们这群人','下课之后','周五见','案例还没写完','明天吃什么'][i]};
 if(stage===5&&version>=3)return {buddies:[[0,1],[2],[3,5],[4],[1,5],[0,2]][i],text:['下课一起去吃饭就行','想找人一起复习','周末有空散步','晚上偶尔打两局','运动完顺路吃饭','不知道吃什么的时候一起商量'][i]};
 if(stage===5)return {text:['作业有问题时能找到人问','想出去玩的时候凑得齐人','消息太多了，有人帮忙整理就好','提了建议能知道后来怎么样','想打球，缺人就能喊到','课件别总是找不到'][i]};
 return version>=3?{picks:[[0,1],[1,2],[0,3],[1,3],[0,2],[2,3]][i]}:{choice:[0,1,0,1,2,3][i]};
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
  const host=token(),screen=token();for(let i=0;i<10;i++){const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const result=await db().prepare('INSERT OR IGNORE INTO rooms(code,host_hash,screen_hash,created_at,expires_at,rules_version,is_demo) VALUES(?,?,?,?,?,4,?)').bind(code,await digest(host),await digest(screen),now,now+7*86400000,b.demo===true?1:0).run();if(result.meta.changes)return json({code,host,screen});}throw new Error('生成房间码失败，请重试');
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
  const payload=validatePayload(r.stage,b.payload,r.rules_version);
  const pending=(r.rules_version>=4&&r.stage===5&&payload.text?.trim())||reviewReason(payload)?2:0;
  const result=await db().prepare(`INSERT INTO answers(id,room,player,stage,payload,submitted_at,hidden)
   SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE code=? AND stage=? AND phase='open' AND round=?)
   ON CONFLICT(room,player,stage) DO UPDATE SET payload=excluded.payload,submitted_at=excluded.submitted_at,hidden=CASE WHEN answers.hidden=1 THEN 1 ELSE excluded.hidden END`).bind(crypto.randomUUID(),r.code,who.id,r.stage,JSON.stringify(payload),now,pending,r.code,r.stage,r.round).run();
  if(!result.meta.changes)throw new Error('本轮已停止收集');return json({saved:true,pending:!!pending,state:await state(req,r.code)});
 }
 if(who.role!=='host')return json({error:'仅主持人可以操作'},403);
 if(b.action==='export'){const rows=await db().prepare('SELECT player,stage,payload,hidden,submitted_at FROM answers WHERE room=? ORDER BY stage,submitted_at').bind(r.code).all();return json({room:r.code,rulesVersion:r.rules_version,revealedMask:r.revealed_mask,demo:!!r.is_demo,round:r.round,exportedAt:new Date().toISOString(),expiresAt:r.expires_at,answers:rows.results});}
 if(b.action==='hide'){await db().prepare('UPDATE answers SET hidden=? WHERE room=? AND id=?').bind(b.hidden?1:0,r.code,String(b.id)).run();return json(await state(req,r.code));}
 if(b.action==='seed'){
  if(!r.is_demo)return json({error:'正式房间不能添加演示数据'},403);
  if(r.phase!=='open'||r.stage<1||r.stage>6)throw new Error('请先开始本关收集');
  for(let i=0;i<6;i++){const id=`demo-${r.code}-${i}`;await db().prepare('INSERT OR IGNORE INTO players(id,room,token_hash,created_at) VALUES(?,?,?,?)').bind(id,r.code,await digest(token()),now).run();const payload=validatePayload(r.stage,demoPayload(r.stage,i,r.rules_version),r.rules_version);await db().prepare(`INSERT INTO answers(id,room,player,stage,payload,submitted_at,hidden) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE code=? AND stage=? AND phase='open' AND round=?) ON CONFLICT(room,player,stage) DO NOTHING`).bind(crypto.randomUUID(),r.code,id,r.stage,JSON.stringify(payload),now+i,r.rules_version>=4&&r.stage===5?2:0,r.code,r.stage,r.round).run();}
  return json(await state(req,r.code));
 }
 if(b.action==='control'){
  if(b.revision!==r.revision)return json({error:'状态已更新，请再操作一次'},409);
  if(b.command==='reset'){
   const result=await db().batch([db().prepare('DELETE FROM answers WHERE room=? AND EXISTS(SELECT 1 FROM rooms WHERE code=? AND revision=?)').bind(r.code,r.code,r.revision),db().prepare(`UPDATE rooms SET stage=0,phase='open',deadline=NULL,remaining=NULL,game_end=NULL,round=round+1,revealed_mask=0,fallback_mask=0,revision=revision+1 WHERE code=? AND revision=?`).bind(r.code,r.revision)]);
   if(!result[1].meta.changes)return json({error:'状态已更新，请再操作一次'},409);return json(await state(req,r.code));
  }
  let stage=r.stage,phase=r.phase,deadline=r.deadline,remaining=r.remaining,revealed=r.revealed_mask,fallback=r.fallback_mask;
  if(b.command==='next'&&stage<7&&(stage===0||phase==='revealed')){stage=r.rules_version>=4&&stage===5?7:stage+1;phase=stage===7?'revealed':'ready';if(stage<7)revealed&=~(1<<stage);deadline=null;remaining=null;}
  else if(b.command==='previous'&&stage>0){stage=r.rules_version>=4&&stage===7?5:stage-1;phase=stage===0?'open':(revealed&(1<<stage))?'revealed':'closed';deadline=null;remaining=null;}
  else if(b.command==='start'&&stage>0&&stage<7&&(phase==='ready'||phase==='closed'||phase==='revealed')){phase='open';revealed&=~(1<<stage);deadline=now+stageFor(stage,r.rules_version).seconds*1000;}
  else if(b.command==='close'&&stage>0&&stage<7&&(phase==='open'||phase==='paused')){phase='closed';deadline=null;remaining=null;}
  else if(b.command==='reveal'&&stage>0&&stage<7&&(phase==='closed'||phase==='open'||phase==='paused')){phase='revealed';revealed|=1<<stage;deadline=null;remaining=null;}
  else if(b.command==='pause'&&phase==='open'){remaining=Math.max(0,(deadline||now)-now);deadline=null;phase='paused';}
  else if(b.command==='resume'&&phase==='paused'){deadline=now+(remaining||30000);phase='open';}
  else if(b.command==='extend'&&phase==='open'){deadline=Math.max(now,deadline||now)+30000;}
  else if(b.command==='handoff'&&stage===7){phase='handoff';}
  else if(b.command==='report'&&stage===7){phase='revealed';}
  else if(b.command==='fallback'&&stage>0&&stage<7){fallback^=1<<stage;}
  else if(b.command==='finish'){stage=7;phase='revealed';deadline=null;}
  else throw new Error('请先结束收集并揭晓结果，再进入下一关');
  const expiry=stage===7&&r.stage!==7?now+7*86400000:r.expires_at;
  const result=await db().prepare('UPDATE rooms SET stage=?,phase=?,deadline=?,remaining=?,expires_at=?,revealed_mask=?,fallback_mask=?,revision=revision+1 WHERE code=? AND revision=?').bind(stage,phase,deadline,remaining,expiry,revealed,fallback,r.code,r.revision).run();
  if(!result.meta.changes)return json({error:'操作冲突，请重试'},409);return json(await state(req,r.code));
 }
 throw new Error('未知操作');
 }catch(e){return json({error:e instanceof Error?e.message:'请求失败，请重试'},400);}}
