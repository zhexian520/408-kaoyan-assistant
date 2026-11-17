#!/bin/bash
# 停止本地 408 Pilot 服务
cd "$(dirname "$0")"
PORT="${PORT:-8010}"

if [ -f ".kaoyan.pid" ]; then
  PID="$(cat .kaoyan.pid)"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "✓ 已停止 PID $PID"
    rm -f .kaoyan.pid
    exit 0
  fi
  rm -f .kaoyan.pid
fi

PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill $PIDS
  echo "✓ 已停止端口 $PORT 上的服务"
else
  echo "服务未运行"
fi
