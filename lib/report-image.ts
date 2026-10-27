import {RESOURCES,BUDDIES,statusesFor,prioritiesFor,stageFor,hasRevealed,allocationStory,topTwo,foodGroups,type GameState} from './game';
import {keywordCloud,layoutWordCloud,type Keyword} from './wordcloud';
export type ReportBlock={kind:'title'|'heading'|'text'|'cloud'|'votes';text?:string;words?:Keyword[];labels?:string[];values?:number[];people?:number};
export function reportBlocks(state:GameState):ReportBlock[]{
 const blocks:ReportBlock[]=[];const add=(kind:ReportBlock['kind'],text:string)=>blocks.push({kind,text});
 add('title','笃行班 · 大二生存锦囊');add('text',`房间 ${state.code} · ${state.demo?'演示报告（含模拟数据，不代表正式结果）':'依据本场真实提交整理'}\n${state.source||state.players+'人加入'}；各项结果仅代表有效参与者，不代表全班共识。`);
 const cards=state.cards.filter(a=>!a.hidden&&a.payload.text?.trim());
 for(let stage=1;stage<=6;stage++){
  add('heading',`0${stage} / ${stageFor(stage,state.rulesVersion).title}`);
  const labels=stage===3?statusesFor(state):stage===4?RESOURCES:stage===5&&state.rulesVersion>=3?BUDDIES:stage===6?prioritiesFor(state):null;
  if(labels){
   if(!hasRevealed(state,stage))add('text','本关尚未揭晓，统计结果不进入报告。');
   else {const count=state.counts[stage]||0;add('text',`${count}人有效参与${count<5?' · 参与较少，仅作参考':''}；${stage===4||stage===6&&state.rulesVersion>=3?'每人选两项，比例之和可达200%。':stage===5?'可多选，比例之和可能超过100%。':'每人一票。'}`);if(!count)add('text','暂无有效投票，不生成排名或共同结论。');else blocks.push({kind:'votes',labels,values:state.totals[stage],people:count,text:labels.map((t,i)=>`${t}：${state.totals[stage]?.[i]||0}票 · ${Math.round((state.totals[stage]?.[i]||0)/count*100)}%`).join('\n')});}
  }
  if(stage===2){const groups=foodGroups(state.cards);if(!groups.length)add('text','暂无公开推荐；没有添加预设店铺。');for(const g of groups)add('text',`${g.shop} · ${g.dish}（${g.count}人推荐）`);}
  if([1,3,5].includes(stage)){
   const replies=cards.filter(a=>a.stage===stage);if(!replies.length)add('text','暂无公开留言；分享自愿，不影响流程。');
   if(stage===3&&hasRevealed(state,3)){const stats=keywordCloud(cards);if(stats.words.length){blocks.push({kind:'cloud',words:stats.words});add('text','关键词按提及人数计数，否定短语保留原意：'+stats.words.map(w=>`${w.text}（${w.count}人）`).join('、'));}else add('text','没有有效关键词，保留空白，不补写观点。');}
   replies.forEach(a=>add('text',`匿名原话：${a.payload.text}`));
  }
  if(stage===4&&hasRevealed(state,4)){const story=allocationStory(state.totals['4']||[]);story.branches.forEach(b=>add('text',`${b.title}：${b.ending}`));if(!story.branches.length)add('text','实际选择不足，不编造剧情结论。');}
  if(stage===1&&hasRevealed(state,1))add('text',cards.some(a=>a.stage===1)?'回忆道具：同频回声。源于本场已公开的百歌留言。':'没有文字留言也不影响继续参与，回忆不必每次说出口。');
  if(stage===5)add('text','联系方式不收集，谁选择了哪一类不公开；愿意的同学会后在班群自行邀请。');
  if(stage===6&&hasRevealed(state,6)){const candidates=topTwo(state.totals['6']||[]);if(candidates.length)add('text','得票较高的待讨论候选：'+candidates.map(i=>prioritiesFor(state)[i]).join('、')+(candidates.length>2?'。第二名边界并列，保留所有同票候选。':'。')+((state.counts['6']||0)<5?'参与较少，仍需继续征询。':''));}
  if(stage===6)add('text','以上仅为待讨论的候选。会后仍需班委确认可行性、负责人和时间，不构成现场承诺。');
 }
 add('heading','游戏结束，但我们的故事还在继续。');add('text','从这些真实的感受出发，接下来有请院领导为笃行班送上建议与寄语。');return blocks;
}
const FONT='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
export function wrapCanvasText(ctx:CanvasRenderingContext2D,text:string,width:number){
 const result:string[]=[];for(const paragraph of text.split('\n')){let line='';for(const char of Array.from(paragraph)){if(line&&ctx.measureText(line+char).width>width){result.push(line);line=char;}else line+=char;}result.push(line);}return result;
}
export async function renderReportPng(blocks:ReportBlock[],onProgress?:(n:number)=>void,options:{demo?:boolean;source?:string}={}):Promise<Blob[]>{
 await document.fonts.ready;
 const W=1000,H=1400,S=2,M=65;const pages:Blob[]=[];
 let canvas!:HTMLCanvasElement,ctx!:CanvasRenderingContext2D,y=0,page=0;
 const start=()=>{canvas=document.createElement('canvas');canvas.width=W*S;canvas.height=H*S;const context=canvas.getContext('2d');if(!context)throw new Error('浏览器无法创建图片，请用电脑浏览器重试');ctx=context;ctx.scale(S,S);ctx.fillStyle='#f8f7f1';ctx.fillRect(0,0,W,H);ctx.fillStyle='#205d49';ctx.fillRect(0,0,W,12);ctx.font=`14px ${FONT}`;ctx.fillText('笃行班 / CLASS QUEST 02 · '+(options.demo?'演示数据，不代表正式结果':options.source?'现场录入，非手机统计':'真实记录'),M,45);ctx.textBaseline='top';y=85;page++;};
 const finish=async()=>{ctx.fillStyle='#7a8279';ctx.font=`14px ${FONT}`;ctx.fillText(`笃行班 · 第 ${page} 页`,M,H-40);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败，请重试')),'image/png'));pages.push(blob);canvas.width=canvas.height=1;onProgress?.(page);};
 start();
 for(const block of blocks){
  if(block.kind==='votes'){
   const max=Math.max(1,...(block.values||[]));
   for(let i=0;i<(block.labels||[]).length;i++){
    if(y+75>H-75){await finish();start();}
    ctx.font=`19px ${FONT}`;ctx.fillStyle='#33463d';ctx.fillText(block.labels![i],M,y);ctx.textAlign='right';const n=block.values?.[i]||0;ctx.fillText(`${n}票 · ${Math.round(n/(block.people||1)*100)}%`,W-M,y);ctx.textAlign='left';ctx.fillStyle='#e0e7d8';ctx.fillRect(M,y+34,W-2*M,10);ctx.fillStyle='#205d49';ctx.fillRect(M,y+34,(W-2*M)*n/max,10);y+=70;
   }
   y+=20;continue;
  }
  if(block.kind==='cloud'){
   if(y+380>H-75){await finish();start();}
   for(const word of layoutWordCloud(block.words||[],870,330)){ctx.font=`600 ${word.size}px ${FONT}`;ctx.fillStyle=['#205d49','#946436','#586f87'][Math.round(word.x)%3];ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(word.text,M+word.x,y+word.y);}
   ctx.textAlign='left';ctx.textBaseline='top';y+=365;continue;
  }
  const size=block.kind==='title'?38:block.kind==='heading'?26:19,lineHeight=Math.ceil(size*1.65);
  ctx.font=`${block.kind==='text'?400:700} ${size}px ${FONT}`;
  const lines=wrapCanvasText(ctx,block.text||'',W-2*M);
  if(block.kind==='heading'&&y+lineHeight*3>H-75){await finish();start();}
  for(const line of lines){if(y+lineHeight>H-75){await finish();start();}ctx.font=`${block.kind==='text'?400:700} ${size}px ${FONT}`;ctx.fillStyle=block.kind==='text'?'#33463d':'#205d49';ctx.fillText(line,M,y);y+=lineHeight;}
  y+=block.kind==='heading'?16:23;
 }
 await finish();return pages;
}
// A dependency-free ZIP writer for long reports: one download, every PNG page retained.
const enc=new TextEncoder();const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
export async function pngArchive(pages:Blob[]):Promise<Blob>{
 const chunks:Uint8Array[]=[],directory:Uint8Array[]=[];let offset=0;
 for(let i=0;i<pages.length;i++){
  const name=enc.encode(`report-${String(i+1).padStart(3,'0')}.png`),data=new Uint8Array(await pages[i].arrayBuffer()),checksum=crc(data);
  const head=new Uint8Array(30+name.length),h=new DataView(head.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,checksum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);head.set(name,30);chunks.push(head,data);
  const entry=new Uint8Array(46+name.length),d=new DataView(entry.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,checksum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);entry.set(name,46);directory.push(entry);offset+=head.length+data.length;
 }
 const size=directory.reduce((sum,b)=>sum+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,pages.length,true);e.setUint16(10,pages.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...directory,end] as BlobPart[],{type:'application/zip'});
}
export async function exportReportPng(state:GameState,onProgress?:(n:number)=>void){
 const pages=await renderReportPng(reportBlocks(state),onProgress,{demo:state.demo,source:state.source});const zip=pages.length>1,blob=zip?await pngArchive(pages):pages[0];const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${state.demo?'演示-':''}笃行班-${state.code}-通关报告${zip?'-高清PNG分页.zip':'.png'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),600000);return {url,pages:pages.length,name:a.download};
}
