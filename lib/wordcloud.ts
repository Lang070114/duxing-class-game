import type {PublicAnswer} from './game';
export type Keyword={text:string;count:number;ids:string[]};
// Local semantic vocabulary: prefer concrete nouns/adjectives; no guessed POS from frequency.
const TERMS=('时间管理 学习压力 团队合作 信息差 待办清单 自主学习 人际关系 课程 作业 竞赛 实习 学习 自学 自律 规划 探索 朋友 兴趣 健康 休息 睡眠 焦虑 迷茫 选择 自由 责任 社团 沟通 成长 时间 压力 忙碌 独立 方向 未来 运动 确定 喜欢 充实 疲惫 孤独 开心 快乐 难过 紧张 安心 担心 期待 困惑 自信 不安 满足 失落 社交 友情 友谊 精力 成绩 绩点 专业 老师 同学关系 生活费 饭堂 外卖 游戏 工作 论文 考试 复习 小组作业 早八 熬夜 周末 假期 计划 目标 经验 机会 资料 耐心 热情 勇气 新鲜 愉快 无聊 轻松 辛苦 困难 复杂 有趣 具体 清楚 稳定 规律 适应 朋友 家人 担忧 失眠 拖延 竞争 研究 保研 考研 就业 工资 管理 学期 任务 安排 篮球 羽毛球 跑步 散步 摄影 音乐 阅读 电影 唱歌 配合 成就 归属感 安全感 幸福感 DDL BUG 忙 累 卷 难').split(' ').sort((a,b)=>b.length-a.length);
const STOP=new Set(('很 特别 比较 有点 一点 真的 就是 然后 所以 但是 不过 我 我们 自己 你 你们 大家 同学 大一 大二 相比 变化 最大 觉得 感觉 现在 以前 之后 开始 新增 功能 修复 问题 出现 新的 一个 一些 一种 一条 这个 那个 这些 那些 非常 更加 已经 还是 也是 可以 可能 需要 希望 时候 因为 这样 那样 一起 事情 方面 生活 发现 学会 变得 测试 的 了 是 在 和 与 也 都 更 就 要 有 做 去 来 说 看 想').split(' '));
const NEG=/(?:并不是|不是没有|不是不|并没有|并不|并非|不再|不想|不愿|不能|不会|没有|没|无|未|(?<!特)别|非(?!常)|不)/;
const evidence=(s:string)=>s.normalize('NFKC').trim();
export function extractKeywords(text:string,useSegmenter=true):string[]{
 const candidates:{word:string;rank:number;order:number}[]=[];let order=0;
 const add=(word:string,rank=1)=>{word=evidence(word);if(word&&!STOP.has(word)&&!/^\d+$/.test(word))candidates.push({word,rank,order:order++});};
 for(const raw of evidence(text).split(/[，。！？；、\n,.!?;]|但是|但|不过|可是|然而/u)){
  let clause=raw.trim();if(!clause)continue;
  // Protect an entire negative expression BEFORE tokenization; never count its positive child.
  clause=clause.replace(/(?:压力|时间|精力|方向|朋友|课程|作业|事情)(?:并)?不(?:太|怎么|那么)?(?:大|多|够|清楚|明确|难|累|轻松)/gu,phrase=>{add(phrase,0);return ' ';});
  const match=NEG.exec(clause);
  if(match){
   const before=clause.slice(0,match.index),tail=clause.slice(match.index);
   let end=tail.length;
   // Match complete chains including double negation and degree words, anchored at the prefix.
   const expression=new RegExp('^(?:并不是|不是没有|不是不|并没有|并不|并非|不再|不想|不愿|不能|不会|没有|没|无|未|别|非|不)(?:太|怎么|那么|什么|很|特别|一点|想|要|去|能|是|有|不|没|再)*(?:'+TERMS.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?:了)?','iu').exec(tail);
   if(expression)end=expression[0].length;
   // Unknown negative tails remain whole phrases (no inferred positive tokens).
   add(tail.slice(0,end),0);clause=before+' '+tail.slice(end);
   if(NEG.test(clause)){for(const word of extractKeywords(clause,useSegmenter))add(word,0);continue;}
  }
  let remaining=clause;
  for(const term of TERMS){const re=new RegExp(term,'giu');if(re.test(remaining)){add((remaining.match(re)||[term])[0]!);remaining=remaining.replace(re,' ');}}
  // Unknown short, complete responses are retained only if safe; avoid arbitrary verb fragments.
  if(useSegmenter&&typeof Intl.Segmenter==='function'){
   const parts=[...new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(remaining)].filter(p=>p.isWordLike);
   for(const part of parts)if(/^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(part.segment)&&!STOP.has(part.segment.toLowerCase()))add(part.segment);
  }
 }
 const unique=new Map<string,{word:string;rank:number;order:number}>();for(const c of candidates){const key=c.word.toLocaleLowerCase();if(!unique.has(key))unique.set(key,c);}
 return [...unique.values()].sort((a,b)=>a.rank-b.rank||a.order-b.order).slice(0,6).map(c=>c.word);
}
export function keywordCloud(cards:PublicAnswer[],useSegmenter=true){
 const source=cards.filter(a=>a.stage===3&&!a.hidden&&a.payload.text?.trim());
 const entries=source.map(a=>({id:a.id,text:a.payload.text!,words:extractKeywords(a.payload.text!,useSegmenter)}));const words=new Map<string,Keyword>();
 for(const entry of entries)for(const word of entry.words){const old=words.get(word)||{text:word,count:0,ids:[]};old.count++;old.ids.push(entry.id);words.set(word,old);}
 return {entries,words:[...words.values()].sort((a,b)=>b.count-a.count||a.text.localeCompare(b.text,'zh-CN'))};
}
export type PlacedWord=Keyword&{x:number;y:number;size:number;width:number;height:number};
export function layoutWordCloud(words:Keyword[],width=1100,height=420):PlacedWord[]{
 const placed:PlacedWord[]=[];const max=Math.max(1,...words.map(w=>w.count));
 for(const word of words.slice(0,60)){
  let size=20+42*Math.sqrt(word.count/max)/Math.max(1,Array.from(word.text).length/5),found=false;
  for(let shrink=0;shrink<4&&!found;shrink++,size*=.82){
   const w=Array.from(word.text).reduce((sum,c)=>sum+(/[\u0000-\u007f]/.test(c) ? 0.62 : 1),0)*size+18,h=size*1.25+12;
   for(let n=0;n<1500;n++){const angle=n*.47,r=4.5*Math.sqrt(n),x=width/2+Math.cos(angle)*r*2.9,y=height/2+Math.sin(angle)*r*1.15;
    if(x-w/2<8||x+w/2>width-8||y-h/2<8||y+h/2>height-8)continue;
    if(placed.some(p=>Math.abs(p.x-x)<(p.width+w)/2&&Math.abs(p.y-y)<(p.height+h)/2))continue;
    placed.push({...word,x,y,size,width:w,height:h});found=true;break;
   }
  }
 }
 return placed;
}
