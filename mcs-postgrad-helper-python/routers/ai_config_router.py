from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.ai_config_service import AIConfigService

router = APIRouter(prefix="/api/ai/config", tags=["AI大模型与引擎配置"])

class UpdateAIConfigRequest(BaseModel):
    provider: Optional[str] = "DEEPSEEK"
    api_key: Optional[str] = ""
    base_url: Optional[str] = "https://api.deepseek.com/v1"
    text_model: Optional[str] = "deepseek-chat"
    vl_model: Optional[str] = "qwen-vl-max"
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 2048
    system_prompt: Optional[str] = "你是一名精通全国计算机考研408专业课（数据结构、组成原理、操作系统、计算机网络）的顶尖AI导师。"

class TestConnectionRequest(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    text_model: Optional[str] = None

@router.get("")
def get_ai_config():
    """获取当前生效的 AI 大模型配置（API Key 进行遮罩脱敏）"""
    try:
        config = AIConfigService.get_config(mask_key=True)
        return {
            "code": 200,
            "message": "获取 AI 配置成功",
            "data": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def update_ai_config(req: UpdateAIConfigRequest):
    """更新并热重载 AI 大模型配置"""
    try:
        saved = AIConfigService.update_config(req.dict())
        return {
            "code": 200,
            "message": "AI 模型配置更新并生效成功",
            "data": saved
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_ai_connection(req: TestConnectionRequest):
    """向大模型接口发送真实连接测试请求，测量往返延迟与响应"""
    try:
        data = req.dict(exclude_none=True)
        result = await AIConfigService.test_connection(test_data=data if data else None)
        return {
            "code": 200,
            "message": "测试请求执行完成",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

