#!/bin/bash
# 本地启动 408 Pilot（FastAPI + PostgreSQL）
set -e

cd "$(dirname "$0")"
PORT="${PORT:-8010}"

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ 服务已在 http://127.0.0.1:$PORT 运行"
  exit 0
fi

if [ ! -x ".venv/bin/python" ]; then
  echo "✗ 未找到 .venv，请先执行：python3.12 -m venv .venv && .venv/bin/pip install -e ."
  exit 1
fi

nohup .venv/bin/python -m uvicorn kaoyan_ai.api:app --host 127.0.0.1 --port "$PORT" > kaoyan.log 2>&1 &
echo $! > .kaoyan.pid

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "✓ 已启动：http://127.0.0.1:$PORT"
    echo "  API 文档：http://127.0.0.1:$PORT/docs"
    echo "  日志：$(pwd)/kaoyan.log"
    exit 0
  fi
  sleep 1
done

echo "✗ 启动超时，请查看 kaoyan.log"
tail -30 kaoyan.log
exit 1
