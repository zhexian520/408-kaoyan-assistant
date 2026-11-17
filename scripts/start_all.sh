#!/bin/bash
# ==============================================================================
# 408 计算机考研智能助手 - 一键全量启动脚本
# ==============================================================================

echo "🚀 [1/4] 检查并启动 Python AI Agent 引擎 (:8000)..."
if lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  ✓ Python 服务已在端口 8000 运行中"
else
    cd mcs-postgrad-helper-python
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > uvicorn.log 2>&1 &
    cd ..
    echo "  ✓ Python 服务已启动 (日志: mcs-postgrad-helper-python/uvicorn.log)"
fi

echo "☕ [2/4] 检查并启动 Java Spring Boot 业务服务 (:8080)..."
if lsof -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  ✓ Java Spring Boot 已在端口 8080 运行中"
else
    cd mcs-postgrad-helper-java
    nohup ./mvnw spring-boot:run > spring-boot.log 2>&1 &
    cd ..
    echo "  ✓ Java 业务后端已启动 (日志: mcs-postgrad-helper-java/spring-boot.log)"
fi

echo "🌐 [3/4] 检查并启动 Web 前端服务 (:3000)..."
if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  ✓ Web 前端已在端口 3000 运行中"
else
    cd mcs-postgrad-helper-web
    nohup npm run dev > web.log 2>&1 &
    cd ..
    echo "  ✓ Web 前端已启动 (日志: mcs-postgrad-helper-web/web.log)"
fi

echo "🧠 [4/4] 检查并启动 408 Pilot 多智能体引擎 (:8010)..."
if lsof -iTCP:8010 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  ✓ 408 Pilot 引擎已在端口 8010 运行中"
else
    if [ -x kaoyan/start_local.sh ]; then
        (cd kaoyan && ./start_local.sh)
    else
        echo "  ! 未找到 kaoyan/start_local.sh，跳过 408 Pilot 引擎"
    fi
fi

echo ""
echo "=========================================================="
echo "🎉 408 计算机考研助手 全栈服务已全部就绪（三端解耦规范架构）！"
echo "🌐 [前台门户入口]: http://localhost:3000"
echo "🎓 [用户端工作台]: http://localhost:3000/user/dashboard"
echo "🧠 [408 Pilot 多智能体引擎]: http://127.0.0.1:8010"
echo "🛡️  [管理端控制台]: http://localhost:3000/admin/dashboard"
echo ""
echo "🔑 测试内置账号："
echo "   👑 管理员账号: admin / admin123 (直达管理端全景仪表盘、用户运维、题库管理)"
echo "   🎓 考研生账号: student / 123456 (直达学员备考仪表盘、全真考场、AI智能体)"
echo "=========================================================="

