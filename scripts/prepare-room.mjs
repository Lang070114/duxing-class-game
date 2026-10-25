import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import QRCode from 'qrcode';
const origin=new URL(process.argv[2]).origin;
const key=process.argv[3]?readFileSync(process.argv[3],'utf8').trim():readFileSync('.dev.vars','utf8').match(/^HOST_SETUP_KEY=(.+)$/m)?.[1];
if(!key)throw new Error('Missing private host setup key.');
const res=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json','X-Host-Key':key},body:JSON.stringify({action:'create'}),signal:AbortSignal.timeout(30000)});
if(!res.headers.get('content-type')?.includes('application/json'))throw new Error(`网站返回${res.status}页面，尚不能用作参与入口；请先排查域名和网络访问。`);
const room=await res.json();if(!res.ok)throw new Error(room.error||'Room creation failed.');
const output=resolve('..');
const join=origin+'/?room='+room.code;
const host=origin+'/?view=host&room='+room.code+'#token='+room.host;
const screen=origin+'/?view=screen&room='+room.code+'#token='+room.screen;
writeFileSync('.sites-runtime/live-room.json',JSON.stringify({...room,origin}));
await QRCode.toFile(resolve(output,'笃行班-同学入口二维码.png'),join,{width:1200,margin:4,errorCorrectionLevel:'M',color:{dark:'#193e35',light:'#ffffff'}});
copyFileSync('public/offline.html',resolve(output,'笃行班-断网应急版.html'));
copyFileSync('docs/主持流程.md',resolve(output,'笃行班-主持流程.md'));
writeFileSync(resolve(output,'笃行班-私密主持入口.md'),`# 笃行班 · 私密主持入口\n\n此文件只留给班长，请勿放进PPT、班级群或GitHub。\n\n- [直接打开本场主持控制页](${host})\n- [打开独立投影页](${screen})\n- [同学参与入口](${join})\n- 本场房间码：**${room.code}**\n\n主持与投影链接包含各自权限，请保存本文件。打开后凭证会留在当前浏览器，地址栏中的凭证会自动移除。若更换电脑或浏览器，请从本文件重新打开。\n\n## 创建另一场房间\n\n打开 ${origin}/?view=host ，填写以下主持口令：\n\n\`${key}\`\n\n新房间会生成不同房间码和二维码。本文件的二维码只对应当前这场，另建房间时请更换PPT二维码。\n\n## 使用步骤\n\n1. 在电脑打开主持页，并打开独立投影页；投影页放到投影屏，控制页保留在电脑上。\n2. 同学微信扫描“笃行班-同学入口二维码.png”，或打开同学入口输入房间码。无需注册登录。\n3. 主持人点击“开启第一关”。所有关卡、揭晓与报告都由主持人手动推进，倒计时仅作参考。\n4. 文字提交后直接展示。选择题收集中，大屏只显示提交人数，揭晓后显示分布。\n5. 班会结束时生成报告，导出答题CSV或JSON，并保存报告HTML/PDF。新房间默认有效7天，生成报告后重新保留7天。\n6. 事先将断网应急HTML保存到电脑，断网时直接打开，改为举手和口头分享、现场录入。\n\n代码版本：GitHub私有仓库 https://github.com/Lang070114/duxing-class-game 。实际答题数据保存在数据库，导出文件由你自行保存，不会放进GitHub。\n`, 'utf8');
if (/^(\d{1,3}\.){3}\d{1,3}$/.test(new URL(origin).hostname)) {
  const file=resolve(output,'笃行班-私密主持入口.md');
  let text=readFileSync(file,'utf8');
  text=text.replace('## 使用步骤','## 当前网络试玩说明\n\n这是局域网版本：电脑和手机必须连接同一Wi-Fi，并允许设备彼此访问。地址和二维码只适用于当前网络，进入教室后需要用教室网络地址重新创建或打开房间并更新二维码。它不是公网入口。答题数据保存在运行服务的电脑上；电脑保持开机、服务保持运行。\n\n## 使用步骤');
  text=text.replace('实际答题数据保存在数据库','当前版本的实际答题数据保存在这台电脑的数据库');
  writeFileSync(file,text,'utf8');
}
console.log(JSON.stringify({code:room.code,joinUrl:join,deliverablesCreated:true}));
