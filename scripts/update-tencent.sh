#!/usr/bin/env bash
set -euo pipefail
BASE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP=/opt/duxing-game/portable-game
DATA=/var/lib/duxing-game
NGINX=/etc/nginx/conf.d/duxing-game.conf
if [ "$(id -u)" -ne 0 ]; then echo '请在腾讯云 root 终端执行此升级脚本。'; exit 1; fi
if [ ! -f "$APP/server.mjs" ] || [ ! -f "$DATA/host-key.txt" ] || [ ! -f "$NGINX" ]; then echo '未找到本次对话配置的游戏或数据目录，停止升级；原服务未改动。'; exit 1; fi
if [ ! -f "$BASE/portable-game/api.mjs" ]; then echo '安装包不完整，请重新解压。'; exit 1; fi
BACKUP="/opt/duxing-backups/$(date +%Y%m%d-%H%M%S)-v0.6.1"
mkdir -p "$BACKUP"
chmod 700 /opt/duxing-backups "$BACKUP"
BACKUP_READY=0
rollback_on_failure() {
  echo '升级未通过检查，正在恢复升级前版本。'
  systemctl stop duxing-game || true
  if [ "$BACKUP_READY" -eq 1 ]; then
    cp -a "$BACKUP/app/." "$APP/"
    mv -- "$DATA" "$BACKUP/failed-data"
    mkdir -p "$DATA"
    cp -a "$BACKUP/data/." "$DATA/"
    chown -R duxing-game:duxing-game "$DATA"
    chmod 700 "$DATA"
    cp -a "$BACKUP/nginx.conf" "$NGINX"
    nginx -t && systemctl reload nginx || true
  fi
  systemctl start duxing-game || true
  echo "备份与故障数据保留在：$BACKUP"
}
trap rollback_on_failure ERR
systemctl stop duxing-game
cp -a "$APP" "$BACKUP/app"
cp -a "$DATA" "$BACKUP/data"
cp -a "$NGINX" "$BACKUP/nginx.conf"
BACKUP_READY=1
cp -a "$BASE/portable-game/." "$APP/"
sed -i -E 's/client_max_body_size[[:space:]]+[^;]+;/client_max_body_size 1m;/' "$NGINX"
nginx -t
systemctl start duxing-game
sleep 2
systemctl is-active --quiet duxing-game
curl --max-time 10 -fsS -H 'Host: 43.139.189.171' http://127.0.0.1/ >/dev/null
systemctl reload nginx
trap - ERR
printf '\n升级完成：游戏 v0.6.1，主持口令、房间与答案保留。\n备份目录：%s\n' "$BACKUP"
printf '原房间与答案保留原题义；已有房间可以继续使用多条弹幕；电影终关仍需v0.6起新建的五关房间。\n升级后请在电脑按Ctrl+F5，手机关闭旧页后重新扫码进入。\n'
