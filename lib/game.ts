export const STAGES = [
 {id:0,short:'集合',title:'大二副本：我们班，正在联机！',subtitle:'从百歌舞台出发，收集生活补给，点亮属于笃行班的新地图。',seconds:0,cue:'扫码匿名加入，不用姓名学号。今天没有个人排名，六个事件由全班一起通关。'},
 {id:1,short:'百歌回声',title:'百歌回忆存档',subtitle:'如果用一句话评价我们班的百歌之旅，你会说什么？',seconds:75,cue:'留言自愿，回想一次排练或演出的具体片段即可。20秒后可讲自己的回忆，30秒左右手动结束等待。'},
 {id:2,short:'生存指南',title:'东校园生存指南',subtitle:'如果向同学推荐一份东校园外卖，你会推荐什么？',seconds:75,cue:'现在进入生活地图。留下店名和菜品，同样的推荐会合并成补给卡。读两份推荐即可。'},
 {id:3,short:'版本更新',title:'大二版本更新日志',subtitle:'大二相比大一，你最近有什么感受？选个状态，想说的话也可以留下。',seconds:90,cue:'先选状态，留言选填。无需现场讲个人困惑。20秒后可展开备用讲解，30秒左右手动结束等待。'},
 {id:4,short:'时间副本',title:'24小时不够用',subtitle:'只能优先照顾两个方向，你会把两枚时间币投向哪里？',seconds:120,cue:'从四个方向选两项，每项一枚时间币。选出的是当下的优先级，不是放弃其他生活。全班前两个方向会解锁一段剧情。'},
 {id:5,short:'寻找搭子',title:'寻找班级搭子',subtitle:'你想找哪种搭子？可以多选，留言选填，联系完全自愿。',seconds:70,cue:'只展示类别分布，不公开谁选了哪类，不现场配对。会后愿意的人可在班群自行邀请。30秒左右手动结束等待。'},
 {id:6,short:'未来地图',title:'解锁未来班级',subtitle:'四个班级彩蛋，选两个你愿意进一步了解的方向。',seconds:90,cue:'每人选两项，只形成候选，不是现场承诺。班委会后确认可行性、负责人和时间；有效参与不足时继续征询。'},
 {id:7,short:'通关报告',title:'笃行班 · 共同通关报告',subtitle:'游戏结束，但我们的故事还在继续。',seconds:0,cue:'这份报告收集了我们的回忆、选择和期待。接下来，有请老师结合这些真实的声音，为进入大二的笃行班送上建议与寄语。'},
] as const;
export const RESOURCES=['学业提升','未来探索','朋友与兴趣','休息与健康'];
export const STATUSES=['最近还挺顺','边走边看看','事情有点多','还没想清楚'];
export const BUDDIES=['干饭搭子','运动搭子','学习搭子','兴趣搭子','游戏搭子','散步聊天搭子'];
export const OLD_STATUSES=['稳定升级中','地图探索中','任务爆满中','寻找主线中'];
export const OLD_PRIORITIES=['学习互助站','成长情报局','兴趣搭子站','班级回声站'];
export const statusesFor=(s:{rulesVersion:number})=>s.rulesVersion>=3?STATUSES:OLD_STATUSES;
export const prioritiesFor=(s:{rulesVersion:number})=>s.rulesVersion>=3?PRIORITIES:OLD_PRIORITIES;
export function stageFor(stage:number,version:number){if(version>=4&&stage===0)return {...STAGES[0],subtitle:'从百歌回忆和生活补给出发，聊聊时间选择，给大学第二季选个电影类型。',cue:'五个事件，匿名参与；每一步由主持人手动推进。'};if(version>=4&&stage===5)return MOVIE_STAGE;if(version<3&&stage===5)return {...STAGES[5],short:'超能觉醒',title:'班级超能力觉醒',subtitle:'如果我们班可以拥有一项超能力，你最希望是什么？',cue:'旧房间保留原题义，文字自愿分享。'};if(version<3&&stage===6)return {...STAGES[6],subtitle:'四个班级设施，你最期待哪一个？每人一票。'};return STAGES[stage];}
export function hasRevealed(state:{revealed?:number[]},stage:number){return !!state.revealed?.includes(stage);}
export const isVoteStage=(s:number,version=3)=>[3,4,6].includes(s)||(s===5&&version>=3);
export const PATCH_KINDS=['新增功能','修复的问题','新出现的 BUG'];
export const PRIORITIES=['东校园干饭情报局','兴趣搭子计划','百歌隐藏相册','班级活动盲盒'];
export const FACILITY_DETAILS=['收集同学实际吃过的店和菜品，供大家参考。','自愿约一次运动、兴趣或散步，不安排强制配对。','在获得授权后整理演出照片，不公开未经同意的照片。','先征集轻量活动想法，再确认时间和负责人。'];
export type Payload={text?:string;shop?:string;dish?:string;kind?:number;status?:number;picks?:number[];choice?:number;buddies?:number[]};
export type PublicAnswer={id:string;stage:number;payload:Payload;hidden:number;submittedAt:number};
export type GameState={source?:string;rulesVersion:number;revealed:number[];fallbacks:number[];demo:boolean;round:number;code:string;stage:number;phase:string;revision:number;deadline:number|null;gameEnd:number|null;expiresAt:number;serverNow:number;players:number;role:string;counts:Record<string,number>;totals:Record<string,number[]>;cards:PublicAnswer[];mine:Record<string,Payload>};
export const MAX_REQUEST_BYTES=1024*1024;
export function validatePayload(stage:number,input:unknown,version=3):Payload{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('答案格式不正确');
 const a=input as Payload;
 const text=(x:unknown)=>{if(typeof x!=='string')throw new Error('请填写文字后提交');const s=x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();if(!s)throw new Error('请填写文字后提交');return s;};
 const option=(x:unknown,n:number)=>{if(!Number.isInteger(x)||(x as number)<0||(x as number)>=n)throw new Error('请先选择一个选项');return x as number;};
 if(stage===6&&version>=4)throw new Error('本版本没有第六关');
 if(stage===1||(stage===5&&version<3))return {text:text(a.text)};
 if(stage===2)return {shop:text(a.shop),dish:text(a.dish)};
 if(stage===3)return {text:typeof a.text==='string'&&a.text.trim()?text(a.text):'',status:option(a.status,4)};
 if(stage===5&&version>=4)return {choice:option(a.choice,6),text:typeof a.text==='string'&&a.text.trim()?text(a.text):''};
 if(stage===5){if(!Array.isArray(a.buddies)||!a.buddies.length||new Set(a.buddies).size!==a.buddies.length)throw new Error('请选择至少一种搭子，也可以跳过本关');return {buddies:a.buddies.map(x=>option(x,6)).sort((a,b)=>a-b),text:typeof a.text==='string'&&a.text.trim()?text(a.text):''};}
 if(stage===4||(stage===6&&version>=3)){if(!Array.isArray(a.picks)||a.picks.length!==2||new Set(a.picks).size!==2)throw new Error('请选择两个不同的方向，每项一枚时间币');return {picks:a.picks.map(x=>option(x,4)).sort((x,y)=>x-y)};}
 if(stage===6)return {choice:option(a.choice,4)};
 throw new Error('本关不接受答题');
}
export function topIndices(values:number[]){const max=Math.max(0,...values);return max===0?[]:values.flatMap((n,i)=>n===max?[i]:[]);}
// A tie at the second-place boundary remains a shared candidate.
export function topTwo(values:number[]){const sorted=values.filter(n=>n>0).sort((a,b)=>b-a);const cutoff=sorted[Math.min(1,sorted.length-1)];return cutoff===undefined?[]:values.flatMap((n,i)=>n>0&&n>=cutoff?[i]:[]);}
export const RESOURCE_SHORT=['学业','探索','同行','续航'];
const BRANCHES:Record<string,{title:string;ending:string}>={
 '0,1':{title:'超级进取模式',ending:'学业进度和未来探索同步推进！不过，系统检测到你的日历正在发出红色预警。'},
 '0,2':{title:'并肩作战模式',ending:'学习和友谊并不矛盾，也许一起学习、互相支持，比独自硬扛更有效率。'},
 '0,3':{title:'稳定输出模式',ending:'你选择先把重要的事情做好，也为自己保留恢复精力的时间。'},
 '1,2':{title:'组队探索模式',ending:'新的兴趣与发展机会，有时就是从一次同学间的交流开始的。'},
 '1,3':{title:'可持续探索模式',ending:'你愿意尝试新的方向，也意识到不能一直依靠透支精力前进。'},
 '2,3':{title:'生活体验模式',ending:'大学不仅有成绩与履历，也有友情、兴趣和照顾自己的时间。'},
};
export function allocationStory(values:number[]){const candidates=topTwo(values);const pairs:number[][]=[];for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(!values.some((n,k)=>k!==candidates[i]&&k!==candidates[j]&&n>Math.min(values[candidates[i]],values[candidates[j]])))pairs.push([candidates[i],candidates[j]]);return {candidates,tied:candidates.length>2,branches:pairs.map(pair=>({pair,...BRANCHES[pair.join(',')]}))};}
export function foodGroups(cards:PublicAnswer[]){
 const groups=new Map<string,{shop:string;dish:string;count:number}>();const norm=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
 for(const a of cards.filter(a=>a.stage===2&&!a.hidden)){const {shop='',dish=''}=a.payload;const key=JSON.stringify([norm(shop),norm(dish)]);const old=groups.get(key);if(old)old.count++;else groups.set(key,{shop,dish,count:1});}
 return [...groups.values()].sort((a,b)=>b.count-a.count||a.shop.localeCompare(b.shop,'zh-CN'));
}
export function echoUnlocked(state:GameState){return state.cards.some(a=>a.stage===1&&!a.hidden)&&(state.stage>1||state.phase==='revealed');}

export const MOVIES=[
{name:'喜剧片',description:'每天总有点意料之外的事，当时觉得崩溃，回头想想又有点好笑。',ending:'日子有时候挺离谱，好在总能找到一些好笑的瞬间。'},
{name:'成长片',description:'一边上课、赶作业，一边慢慢摸索自己到底想做什么。',ending:'我们还在摸索，也还在慢慢往前走。'},
{name:'冒险片',description:'新活动、新体验、新选择不断出现，下一步会发生什么还真说不准。',ending:'下一关是什么，先走着看看。'},
{name:'群像片',description:'大家平时各忙各的，但凑到一起，总能留下不少共同回忆。',ending:'大家各有各的故事，也有一起经历过的片段。'},
{name:'职场预演片',description:'案例分析、小组展示、分工合作，有时候真有种提前上班的感觉。',ending:'小组作业暂告一段落，下一份任务还在路上。'},
{name:'悬疑片',description:'老师到底会考什么？DDL怎么又来了？这个小组作业最后究竟能不能顺利交上去？',ending:'下一集会发生什么？目前还没有人知道。'},
];
export const MOVIE_STAGE={id:5,short:'大学第二季',title:'我们班的大学第二季',subtitle:'如果把我们班目前的大学第二季拍成一部电影，你觉得它最像哪一种？',seconds:100,cue:'单选电影类型，片名选填。结束收集并揭晓后看分布、最高票类型、已审核片名。不要求公开解释选择；零参与也可继续收尾。'};
export const stagesFor=(version:number)=>STAGES.filter(s=>version<4||s.id!==6).map(s=>stageFor(s.id,version));
export const finalStage=(version:number)=>version>=4?5:6;
export const HANDOFF=['同一段大学生活，每个人都有自己的视角。','游戏结束，但我们的故事还在继续。','刚才大家给我们班的大学第二季选了不同的电影类型，也起了不少有意思的名字。看来，虽然我们在同一个班，但每个人的大学生活还是有自己的样子。','接下来，我们也非常荣幸邀请学院领导，结合大家的学习生活和成长需求，为我们新学年的大学生活分享一些建议。'];
