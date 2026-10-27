import { env } from 'cloudflare:workers';
import { STAGES, validatePayload, type Payload } from '@/lib/game-legacy';
export const dynamic = 'force-dynamic';
type Room = { revealed_mask:number; code: string; host_hash: string; screen_hash: string; stage: number; phase: string; revision: number; deadline: number | null; remaining: number | null; game_end: number | null; expires_at: number };
type Answer = { id: string; player: string; stage: number; payload: string; hidden: number; submitted_at: number };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
const digest = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const db = () => { if (!env.DB) throw new Error('数据库尚未配置，请联系主持人'); return env.DB; };
async function roomFor(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('请输入6位房间码');
  let room = await db().prepare('SELECT * FROM rooms WHERE code=?').bind(code).first<Room>();
  if (!room || room.expires_at <= Date.now()) throw new Error('房间不存在或已过保存期');
  return room;
}
async function identity(req: Request, room: Room) {
  const raw = req.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (raw.length < 20 || raw.length > 200) throw new Error('请重新加入房间');
  const hash = await digest(raw);
  if (hash === room.host_hash) return { role: 'host', id: '' };
  if (hash === room.screen_hash) return { role: 'screen', id: '' };
  const p = await db().prepare('SELECT id FROM players WHERE room=? AND token_hash=?').bind(room.code, hash).first<{ id: string }>();
  if (!p) throw new Error('参与凭证无效，请重新加入房间');
  return { role: 'player', id: p.id };
}
async function state(req: Request, code: string) {
  const r = await roomFor(code); const who = await identity(req, r);
  const [all, count] = await Promise.all([
    db().prepare('SELECT * FROM answers WHERE room=? ORDER BY submitted_at ASC').bind(code).all<Answer>(),
    db().prepare('SELECT COUNT(*) AS n FROM players WHERE room=?').bind(code).first<{ n: number }>(),
  ]);
  const counts: Record<string, number> = {}; const totals: Record<string, number[]> = { '3': [0, 0, 0], '4': [0, 0, 0], '5': [0, 0, 0, 0], '6': [0, 0, 0, 0] };
  const mine: Record<string, Payload> = {};
  for (const a of all.results) {
    counts[a.stage] = (counts[a.stage] || 0) + 1; const p: Payload = JSON.parse(a.payload);
    if (a.player === who.id) mine[a.stage] = p;
    if (a.stage>=3 && !(r.revealed_mask & (1<<a.stage))) continue;
    if (a.stage === 3) p.coins!.forEach((n, i) => totals['3'][i] += n);
    if (a.stage === 4 || a.stage === 6) totals[a.stage][p.choice!]++;
    if (a.stage === 5) totals['5'][p.category!]++;
  }
  for(const key of [3,4,5,6])if(!(r.revealed_mask&(1<<key))){delete counts[key];totals[key]=[];}
  const cards = all.results.filter(a => [1, 2, 5].includes(a.stage) && (who.role === 'host' || !a.hidden)).map(a => ({ id: a.id, stage: a.stage, payload:a.stage===5?{text:JSON.parse(a.payload).text}:JSON.parse(a.payload), hidden: a.hidden, submittedAt: a.submitted_at }));
  return { revealed:[1,2,3,4,5,6].filter(i=>!!(r.revealed_mask&(1<<i))),code, stage: r.stage, phase: r.phase, revision: r.revision, deadline: r.deadline, gameEnd: r.game_end, expiresAt: r.expires_at, serverNow: Date.now(), players:r.stage===0||r.stage===7?count?.n||0:0, role: who.role, counts, totals, cards, mine };
}
export async function GET(req: Request) {
  try { return json(await state(req, new URL(req.url).searchParams.get('room') || '')); }
  catch (e) { return json({ error: e instanceof Error ? e.message : '读取失败，请重试' }, 400); }
}
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('Origin'); if (origin && origin !== new URL(req.url).origin) return json({ error: '请求来源不匹配' }, 403);
    if (Number(req.headers.get('Content-Length') || 0) > 8000) return json({ error: '提交内容过长' }, 413);
    const raw = await req.text(); if (raw.length > 8000) return json({ error: '提交内容过长' }, 413);
    const b = JSON.parse(raw); const now = Date.now();
    if (b.action === 'cleanup') {
      const result = await db().prepare('DELETE FROM rooms WHERE expires_at<=?').bind(now).run();
      return json({ deleted: result.meta.changes });
    }
    if (b.action === 'create') {
      const secret = (env as unknown as { HOST_SETUP_KEY?: string }).HOST_SETUP_KEY;
      if (!secret || await digest(req.headers.get('X-Host-Key') || '') !== await digest(secret)) return json({ error: '主持口令不正确' }, 403);
      if ((await db().prepare('SELECT COUNT(*) AS n FROM rooms WHERE expires_at>?').bind(now).first<{ n: number }>())!.n >= 30) throw new Error('有效房间数量已达上限，请复用已有房间');
      const host = token(), screen = token(); let code = '';
      for (let i = 0; i < 10; i++) {
        code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
        const result = await db().prepare('INSERT OR IGNORE INTO rooms (code,host_hash,screen_hash,created_at,expires_at) VALUES (?,?,?,?,?)').bind(code, await digest(host), await digest(screen), now, now + 7 * 86400000).run();
        if (result.meta.changes) return json({ code, host, screen });
      }
      throw new Error('生成房间码失败，请重试');
    }
    const r = await roomFor(String(b.code || ''));
    if (b.action === 'join') {
      if (r.stage === 7) throw new Error('本场已结束，不能再加入');
      const id = crypto.randomUUID(), credential = token();
      const result = await db().prepare('INSERT INTO players (id,room,token_hash,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM players WHERE room=?) < 80').bind(id, r.code, await digest(credential), now, r.code).run();
      if (!result.meta.changes) throw new Error('房间人数已满，请联系主持人');
      return json({ token: credential, id });
    }
    const who = await identity(req, r);
    if (b.action === 'answer') {
      if (who.role !== 'player') return json({ error: '只有同学端可以提交答案' }, 403);
      if (b.stage !== r.stage || r.phase !== 'open') throw new Error('本轮已停止收集，请等待主持人');
      const payload = validatePayload(r.stage, b.payload);
      const result = await db().prepare(`INSERT INTO answers (id,room,player,stage,payload,submitted_at)
        SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE code=? AND stage=? AND phase='open')
        ON CONFLICT(room,player,stage) DO UPDATE SET payload=excluded.payload,submitted_at=excluded.submitted_at`).bind(crypto.randomUUID(), r.code, who.id, r.stage, JSON.stringify(payload), now, r.code, r.stage).run();
      if (!result.meta.changes) throw new Error('本轮已停止收集');
      return json({ saved: true, state: await state(req, r.code) });
    }
    if (who.role !== 'host') return json({ error: '仅主持人可以操作' }, 403);
    if (b.action === 'export') {
      const rows = await db().prepare('SELECT player,stage,payload,hidden,submitted_at FROM answers WHERE room=? ORDER BY stage,submitted_at').bind(r.code).all();
      return json({ room: r.code, exportedAt: new Date().toISOString(), expiresAt: r.expires_at, answers: rows.results });
    }
    if (b.action === 'hide') {
      await db().prepare('UPDATE answers SET hidden=? WHERE room=? AND id=?').bind(b.hidden ? 1 : 0, r.code, String(b.id)).run(); return json(await state(req, r.code));
    }
    if (b.action === 'control') {
      if (b.revision !== r.revision) return json({ error: '状态已更新，请再操作一次' }, 409);
      let stage = r.stage, phase = r.phase, deadline = r.deadline, remaining = r.remaining, end = r.game_end;
      if (b.command === 'next' && stage < 7) {
        stage++; phase = stage === 7 ? 'revealed' : 'open'; remaining = null;
        deadline = stage === 7 ? null : now + STAGES[stage].seconds * 1000;
      } else if (b.command === 'reveal' && stage > 0 && stage < 7) { phase = 'revealed'; }
      else if (b.command === 'pause' && phase === 'open' && deadline && stage > 0 && stage < 7) { remaining = Math.max(0, deadline - now); deadline = null; phase = 'paused'; }
      else if (b.command === 'resume' && phase === 'paused') { deadline = now + (remaining || 30000); phase = 'open'; }
      else if (b.command === 'extend' && stage > 0 && stage < 7 && phase !== 'paused') { phase = 'open'; deadline = Math.max(now, deadline || now) + 30000; }
      else if (b.command === 'finish') { stage = 7; phase = 'revealed'; deadline = null; }
      else throw new Error('当前不能执行这个操作');
      const expiry = stage === 7 && r.stage !== 7 ? now + 7 * 86400000 : r.expires_at;
      const result = await db().prepare(`UPDATE rooms SET revealed_mask=CASE WHEN ?='reveal' THEN revealed_mask | (1 << stage) WHEN ?='extend' THEN revealed_mask & ~(1 << stage) ELSE revealed_mask END,stage=?,phase=?,deadline=?,remaining=?,game_end=?,expires_at=?,revision=revision+1 WHERE code=? AND revision=?`).bind(b.command,b.command,stage, phase, deadline, remaining, end, expiry, r.code, r.revision).run();
      if (!result.meta.changes) return json({ error: '操作冲突，请重试' }, 409);
      return json(await state(req, r.code));
    }
    throw new Error('未知操作');
  } catch (e) { return json({ error: e instanceof Error ? e.message : '请求失败，请重试' }, 400); }
}
