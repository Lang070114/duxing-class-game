export const STAGES = [
  { id: 0, short: '连接', title: '你的队友，正在身边', subtitle: '百歌任务已完成。大二的新地图，等我们一起打开。', seconds: 0, cue: '大家扫一下屏幕上的二维码，不用填写姓名。今天没有个人排名，我们一起完成班级任务。' },
  { id: 1, short: '补给站', title: '留一条队友用得上的情报', subtitle: '东校区补给站已开启。一个生活攻略，或一段百歌记忆。', seconds: 90, cue: '先来一点轻松的：推荐一餐，或者留住百歌的一个瞬间。两种任务，任选一种。揭晓后读两条就好。' },
  { id: 2, short: '更新日志', title: '大二的你，更新了什么？', subtitle: '版本从 1.0 升至 2.0。请提交你的一条更新说明。', seconds: 90, cue: '相比大一，你新增了什么能力或感受，又开始需要什么？有趣的变化和真实的困惑都可以写。' },
  { id: 3, short: '时间背包', title: '今晚只剩 4 格时间', subtitle: '小组展示还有一天，社团也在催进度。你会怎样安排？', seconds: 90, cue: '每人有四枚时间币，分给课程任务、课外机会和休息生活。没有标准答案，但只能用四枚。' },
  { id: 4, short: '突发事件', title: '队友发来了一条消息', subtitle: '“我这两天状态不太好，可能赶不上原计划。”', seconds: 60, cue: '这次我们面对同一个意外。先做选择，再看看全班准备怎样一起走下去。揭晓后读一句结果即可。' },
  { id: 5, short: '超能力', title: '联机之后，我们能多做什么？', subtitle: '单人的时间有限。给班级解锁一种互助技能。', seconds: 90, cue: '如果班级能提供一种帮助，你希望是什么？选一个方向，也可以补充具体做法。' },
  { id: 6, short: '共同任务', title: '下一件小事，一起决定', subtitle: '这学期，我们先认真推进哪件事？每人一票。', seconds: 60, cue: '把期待变成可做的事情。请投一票，班委会后确认执行安排；并列时保留共同候选。' },
  { id: 7, short: '班级报告', title: '大二副本已开启', subtitle: '笃行班，仍在联机。', seconds: 0, cue: '这份报告里，有生活经验，也有正在面对的选择。接下来，想请老师结合这些真实的声音，给正在进入大二的我们一些建议。' },
] as const;
export const RESOURCES = ['课程任务', '课外机会', '休息生活'];
export const SKILLS = ['学习搭子', '经验分享', '运动陪伴', '生活攻略'];
export const PRIORITIES = ['学习互助小组', '大二经验交流', '班级运动或散步', '东校区生活攻略'];
export const EVENT_OPTIONS = [
  { label: '我先补上关键部分', detail: '先让眼前的进度动起来', result: '眼前进度推进了，也需要确认自己的承受范围。' },
  { label: '先了解情况，再调整分工', detail: '给沟通留一点时间', result: '协调需要一点时间，但任务和成员的状态都被看见了。' },
  { label: '一起缩小范围，保证核心质量', detail: '共同做一次取舍', result: '团队决定做取舍，也需要向相关同学或老师说明调整。' },
];
export type Payload = { category?: number; text?: string; need?: string; coins?: number[]; choice?: number };
export type PublicAnswer = { id: string; stage: number; payload: Payload; hidden: number; submittedAt: number };
export type GameState = {revealed?:number[]; code: string; stage: number; phase: string; revision: number; deadline: number | null; gameEnd: number | null; expiresAt: number; serverNow: number; players: number; role: string; counts: Record<string, number>; totals: Record<string, number[]>; cards: PublicAnswer[]; mine: Record<string, Payload> };
export function validatePayload(stage: number, input: unknown): Payload {
  const a = input as Payload;
  const clean = (x: unknown, max = 60) => {
    if (typeof x !== 'string') throw new Error('请填写文字后提交');
    const s = x.trim().replace(/[\u0000-\u001f]/g, '');
    if (!s || Array.from(s).length > max) throw new Error(`请填写1—${max}字`);
    return s;
  };
  if (!a || typeof a !== 'object' || Array.isArray(a)) throw new Error('答案格式不正确');
  if (stage === 1) { if (![0, 1].includes(a.category!)) throw new Error('请选择一种补给'); return { category: a.category, text: clean(a.text) }; }
  if (stage === 2) return { text: clean(a.text, 30), need: clean(a.need, 30) };
  if (stage === 3) { if (!Array.isArray(a.coins) || a.coins.length !== 3 || a.coins.some(n => !Number.isInteger(n) || n < 0 || n > 4) || a.coins.reduce((s, n) => s + n, 0) !== 4) throw new Error('请恰好分配4枚时间币'); return { coins: a.coins }; }
  if (stage === 4 || stage === 6) { if (!Number.isInteger(a.choice) || a.choice! < 0 || a.choice! >= (stage === 4 ? 3 : 4)) throw new Error('请先选择一个选项'); return { choice: a.choice }; }
  if (stage === 5) { if (!Number.isInteger(a.category) || a.category! < 0 || a.category! > 3) throw new Error('请选择一个互助方向'); return { category: a.category, ...(a.text?.trim() ? { text: clean(a.text) } : {}) }; }
  throw new Error('本关不接受答题');
}
export function topIndices(values: number[]): number[] {
  const max = Math.max(0, ...values); return max === 0 ? [] : values.flatMap((n, i) => n === max ? [i] : []);
}
export function allocationStory(values: number[]) {
  const top = topIndices(values);
  if (!top.length) return { title: '背包等待装填', text: '本轮暂未形成结论。' };
  if (top.length > 1) return { title: '多线并行', text: '大家的选择各不相同，接下来需要协调。' };
  return [
    { title: '稳步推进', text: '展示有了底气，但待办清单还没清空。' },
    { title: '主动探索', text: '你发现了新机会，原有任务也需要重新安排。' },
    { title: '恢复续航', text: '状态正在恢复，下一步要确定从哪件事开始。' },
  ][top[0]];
}
