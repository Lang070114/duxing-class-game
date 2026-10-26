export const STAGES = [
 {id:0,short:'集合',title:'大二副本：我们班，正在联机！',subtitle:'从百歌舞台出发，收集生活补给，点亮属于笃行班的新地图。',seconds:0,cue:'扫码匿名加入，不用姓名学号。今天没有个人排名，六个事件由全班一起通关。'},
 {id:1,short:'百歌回声',title:'百歌通关弹幕',subtitle:'如果用一句话评价我们班的百歌之旅，你会说什么？',seconds:75,cue:'从一起登台的回忆开始。请大家发一句感想，我读两条。我们的共同回忆，会成为后面关卡的道具。'},
 {id:2,short:'生存指南',title:'东校园生存指南',subtitle:'如果向同学推荐一份东校园外卖，你会推荐什么？',seconds:75,cue:'现在进入生活地图。留下店名和菜品，同样的推荐会合并成补给卡。读两份推荐即可。'},
 {id:3,short:'版本更新',title:'大二版本更新日志',subtitle:'如果给大二写一条版本更新日志，你觉得最大的变化是什么？',seconds:90,cue:'新增了什么、修复了什么、又发现了什么BUG？再选一个当前状态。有些变化很好笑，有些也需要一起面对。'},
 {id:4,short:'时间副本',title:'24小时不够用',subtitle:'只能优先照顾两个方向，你会把两枚时间币投向哪里？',seconds:120,cue:'从四个方向选两项，每项一枚时间币。选出的是当下的优先级，不是放弃其他生活。全班前两个方向会解锁一段剧情。'},
 {id:5,short:'超能觉醒',title:'班级超能力觉醒',subtitle:'如果我们班可以拥有一项超能力，你最希望是什么？',seconds:90,cue:'刚才我们看到了个人时间的边界。现在把想象力交给班级：怎样的超能力，能让彼此更有力量？读两条具体期待。'},
 {id:6,short:'未来地图',title:'解锁未来班级',subtitle:'四个班级设施，你最期待先建成哪一个？每人一票。',seconds:90,cue:'从奇思妙想走到一件可做的小事。前两名会点亮班级地图；并列会保留同票候选，不由系统暗中裁决。'},
 {id:7,short:'通关报告',title:'笃行班 · 共同通关报告',subtitle:'游戏结束，但我们的故事还在继续。',seconds:0,cue:'这份报告收集了我们的回忆、选择和期待。接下来，有请老师结合这些真实的声音，为进入大二的笃行班送上建议与寄语。'},
] as const;
export const RESOURCES=['学业提升','未来探索','朋友与兴趣','休息与健康'];
export const STATUSES=['稳定升级中','地图探索中','任务爆满中','寻找主线中'];
export const PATCH_KINDS=['新增功能','修复的问题','新出现的 BUG'];
export const PRIORITIES=['学习互助站','成长情报局','兴趣搭子站','班级回声站'];
export const FACILITY_DETAILS=['共享学习资料与答疑，让困难有人一起拆解。','交换竞赛、实习与发展经验，让探索少一点信息差。','约运动、约兴趣、约活动，让共同爱好变成连接。','定期收集建议与反馈，让每一种声音都有回应。'];
export type Payload={text?:string;shop?:string;dish?:string;kind?:number;status?:number;picks?:number[];choice?:number};
export type PublicAnswer={id:string;stage:number;payload:Payload;hidden:number;submittedAt:number};
export type GameState={rulesVersion:number;demo:boolean;round:number;code:string;stage:number;phase:string;revision:number;deadline:number|null;gameEnd:number|null;expiresAt:number;serverNow:number;players:number;role:string;counts:Record<string,number>;totals:Record<string,number[]>;cards:PublicAnswer[];mine:Record<string,Payload>};
export const MAX_REQUEST_BYTES=1024*1024;
export function validatePayload(stage:number,input:unknown):Payload{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('答案格式不正确');
 const a=input as Payload;
 const text=(x:unknown)=>{if(typeof x!=='string')throw new Error('请填写文字后提交');const s=x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();if(!s)throw new Error('请填写文字后提交');return s;};
 const option=(x:unknown,n:number)=>{if(!Number.isInteger(x)||(x as number)<0||(x as number)>=n)throw new Error('请先选择一个选项');return x as number;};
 if(stage===1||stage===5)return {text:text(a.text)};
 if(stage===2)return {shop:text(a.shop),dish:text(a.dish)};
 if(stage===3)return {text:text(a.text),status:option(a.status,4)};
 if(stage===4){if(!Array.isArray(a.picks)||a.picks.length!==2||new Set(a.picks).size!==2)throw new Error('请选择两个不同的方向，每项一枚时间币');return {picks:a.picks.map(x=>option(x,4)).sort((x,y)=>x-y)};}
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
