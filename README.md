# 笃行班｜大二副本：我们班，正在联机！

版本 v0.3.0：在原项目上迭代，保留 React/Vinext、共享 API、SQLite、Node.js 24 独立运行和腾讯云 Nginx + systemd 部署。

六个事件：百歌动态弹幕、东校园美食指南、大二更新日志与状态票、四方向双选时间副本、班级超能力、未来设施投票与通关报告。开放文字直接展示，主持可隐藏；所有进度手动控制，计时仅作参考。

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

HTTP集成测试在本机临时目录启动服务器，不访问正式云端房间。班委可在主持入口勾选演示模式；正式房间禁止注入模拟数据。已有旧房间继续原玩法，新建房间采用六事件规则。

- [检查、使用与腾讯云升级说明](docs/迭代检查与验收.md)
- [45分钟班会与15分钟游戏主持流程](docs/主持流程.md)
- 离线源文件：public/offline.html，构建时从 standalone/offline.ts 生成，无外部依赖。
- 腾讯云升级脚本：scripts/update-tencent.sh，升级前备份代码、数据库、主持口令和Nginx配置，保留原运行服务与数据路径。

不要将 .dev.vars、data目录、数据库、主持口令、私密入口、答题导出文件放入GitHub。
