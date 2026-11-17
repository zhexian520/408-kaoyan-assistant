import uvicorn
import jwt
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from routers.grading_router import router as grading_router
from routers.agent_router import router as agent_router
from routers.qa_router import router as qa_router
from routers.multimodal_router import router as multimodal_router
from routers.variant_router import router as variant_router
from routers.rag_router import router as rag_router
from routers.plan_router import router as plan_router
from routers.ai_config_router import router as ai_config_router
from routers.exam_mock_router import router as exam_mock_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="408 计算机考研智能助手 - Python AI Agent 服务引擎"
)

# 校验 /api/ai/* 的登录态；Java 内部调用通过 X-Internal-Token 放行
@app.middleware("http")
async def verify_ai_token(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/ai/") and request.method.upper() != "OPTIONS":
        if request.headers.get("x-internal-token") == settings.INTERNAL_API_TOKEN:
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        try:
            payload = jwt.decode(
                token,
                settings.MCS_JWT_SECRET,
                algorithms=["HS256", "HS384", "HS512"],
            )
            request.state.user_id = payload.get("userId") or payload.get("sub")
        except Exception:
            return JSONResponse(
                status_code=401,
                content={"detail": "请先登录后再使用 AI 服务"},
            )
    return await call_next(request)

# 允许跨域请求（放在鉴权中间件之后，保证 401 响应也带 CORS 头）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由
app.include_router(grading_router)
app.include_router(agent_router)
app.include_router(qa_router)
app.include_router(multimodal_router)
app.include_router(variant_router)
app.include_router(rag_router)
app.include_router(plan_router)
app.include_router(ai_config_router)
app.include_router(exam_mock_router)

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {
        "status": "UP",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
