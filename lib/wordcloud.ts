import type {PublicAnswer} from './game';
export type Keyword={text:string;count:number;ids:string[]};
const STOP=new Set(('我 我们 自己 你 你们 大家 同学 大一 大二 相比 变化 最大 觉得 感觉 遇到 主动 保持 还长 现在 以前 之后 开始 新增 功能 修复 问题 出现 新的 一个 一些 一种 一条 这个 那个 这些 那些 真的 非常 更加 比较 已经 还是 也是 可以 可能 需要 希望 时候 因为 所以 然后 但是 不过 就是 这样 那样 没有 不会 一起 事情 方面 生活 发现 学会 变得 测试 的 了 是 在 和 与 也 都 很 更 就 要 有 不').split(' '));
const SINGLE=new Set(['忙','累','卷','难']);
const ALIASES:Record<string,string>={ddl:'DDL',deadline:'DDL',bug:'BUG',忙:'忙碌',忙碌:'忙碌'};
const FALLBACK_TERMS=['时间管理','学习压力','团队合作','信息差','待办清单','自主学习','人际关系','课程','作业','竞赛','实习','学习','自学','自律','规划','探索','朋友','兴趣','健康','休息','睡眠','焦虑','迷茫','选择','自由','责任','社团','沟通','成长','时间','压力','忙碌','独立'];
function normalize(token:string){const s=token.normalize('NFKC').trim().toLocaleLowerCase();return ALIASES[s]||s;}
export function extractKeywords(text:string,useSegmenter=true):string[]{
 let tokens:string[]=[];let content=text;for(const phrase of FALLBACK_TERMS.filter(w=>Array.from(w).length>=4).sort((a,b)=>b.length-a.length)){if(content.includes(phrase)){tokens.push(phrase);content=content.split(phrase).join(' ');}}
 if(useSegmenter&&typeof Intl.Segmenter==='function'){for(const part of new Intl.Segmenter('zh-CN',{granularity:'word'}).segment(content))if(part.isWordLike)tokens.push(part.segment);}
 else{
  let remaining=content;for(const term of FALLBACK_TERMS){if(remaining.includes(term)){tokens.push(term);remaining=remaining.split(term).join(' ');}}
  for(const stop of [...STOP].sort((a,b)=>b.length-a.length))if(stop.length>1)remaining=remaining.split(stop).join(' ');
  tokens.push(...(remaining.match(/[a-zA-Z][a-zA-Z0-9_-]*|[\p{Script=Han}]{2,6}|[忙累卷难]/gu)||[]));
 }
 const counts=new Map<string,{count:number;order:number}>();
 tokens.forEach((token,order)=>{const word=normalize(token);if(STOP.has(word)||(!SINGLE.has(word)&&Array.from(word).length<2)||Array.from(word).length>24||!/[\p{L}]/u.test(word))return;const prev=counts.get(word);counts.set(word,{count:(prev?.count||0)+1,order:prev?.order??order});});
 return [...counts].sort((a,b)=>b[1].count-a[1].count||a[1].order-b[1].order).slice(0,6).map(([word])=>word);
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
