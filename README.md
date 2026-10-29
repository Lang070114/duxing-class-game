# 笃行班｜大二副本：我们班，正在联机！

版本 v0.6.1：在原项目上迭代，保留 React/Vinext、共享 API、SQLite、Node.js 24 独立运行和腾讯云 Nginx + systemd 部署。

本次改进：保留前四关，将原来的搭子和彩蛋两关合并为电影单选终关“我们班的大学第二季”。六种电影类型必选一项，片名选填且全部先审核；揭晓前只显示总提交人数，揭晓后显示真实分布与并列结果。百歌、外卖和大二感受支持一人发送多条弹幕，新发送不会覆盖旧内容；投票每人仍只计一份。详见 [本次更新与升级](docs/本次更新-v0.6.1.md)。

五个事件：百歌回忆弹幕、东校园生活推荐、大二状态与选填感受、双选时间币、大学第二季电影投票。前四关保留原有流程和规则，全部进度手动控制，计时仅作参考。旧房间保留原玩法和答案，新建房间才使用五关。

## 启动

```powershell
npm ci
npm run build:standalone
npm run start:standalone
```

已有依赖时跳过 `npm ci`。打开 http://127.0.0.1:3020/?view=host ，主持口令位于 standalone-dist/data/host-key.txt。公开网络访问需要实际网络地址，不能把 localhost 发给手机。

## 测试

```powershell
npm run typecheck
npm run test:game
```

HTTP集成测试在本机临时目录启动服务器，不访问正式云端房间。班委可在主持入口勾选演示模式；正式房间禁止注入模拟数据。已有旧房间继续原玩法，新建房间采用五事件电影规则。

- [检查、使用与腾讯云升级说明](docs/迭代检查与验收.md)
- [45分钟班会与15分钟游戏主持流程](docs/主持流程-v0.6.0.md)
- 离线源文件：public/offline.html，构建时从 standalone/offline-v5.ts 生成，无外部依赖。
- 腾讯云升级脚本：scripts/update-tencent.sh，升级前备份代码、数据库、主持口令和Nginx配置，保留原运行服务与数据路径。

不要将 .dev.vars、data目录、数据库、主持口令、私密入口、答题导出文件放入GitHub。
