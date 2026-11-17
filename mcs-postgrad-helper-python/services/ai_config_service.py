import os
import time
import httpx
import pymysql
from typing import Dict, Any, Optional
from config import settings

class AIConfigService:
    _cached_config: Optional[Dict[str, Any]] = None

    @classmethod
    def _get_db(cls):
        return pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset="utf8mb4",
            autocommit=True
        )

    @classmethod
    def get_config(cls, mask_key: bool = True) -> Dict[str, Any]:
        """从数据库读取当前生效的 AI 大模型配置"""
        try:
            conn = cls._get_db()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            cursor.execute("""
                SELECT id, provider, api_key, base_url, text_model, vl_model, 
                       temperature, max_tokens, is_active, system_prompt, updated_at
                FROM sys_ai_config 
                WHERE is_active = 1 
                ORDER BY id DESC LIMIT 1
            """)
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row:
                cls._cached_config = row
                cfg = dict(row)
                if mask_key and cfg.get("api_key"):
                    raw = cfg["api_key"]
                    if len(raw) > 8:
                        cfg["masked_api_key"] = f"{raw[:4]}****{raw[-4:]}"
                    else:
                        cfg["masked_api_key"] = "****"
                    cfg["has_key"] = True
                else:
                    cfg["has_key"] = bool(cfg.get("api_key"))
                    cfg["masked_api_key"] = ""
                return cfg
        except Exception as e:
            print(f"[!] 读取 sys_ai_config 失败: {e}")

        # 兜底返回环境变量或默认值
        return {
            "id": 1,
            "provider": "DEEPSEEK",
            "api_key": settings.LLM_API_KEY,
            "masked_api_key": f"{settings.LLM_API_KEY[:4]}****{settings.LLM_API_KEY[-4:]}" if len(settings.LLM_API_KEY) > 8 else ("****" if settings.LLM_API_KEY else ""),
            "has_key": bool(settings.LLM_API_KEY),
            "base_url": settings.LLM_BASE_URL,
            "text_model": settings.LLM_MODEL,
            "vl_model": "qwen-vl-max",
            "temperature": 0.3,
            "max_tokens": 2048,
            "is_active": 1,
            "system_prompt": "你是一名精通全国计算机考研408专业课（数据结构、组成原理、操作系统、计算机网络）的顶尖AI导师。"
        }

    @classmethod
    def update_config(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新并热重载 AI 大模型配置"""
        conn = cls._get_db()
        cursor = conn.cursor()

        api_key = data.get("api_key")
        # 如果传入的是遮罩 key，则不覆盖原有 key
        if api_key and "****" in api_key:
            current = cls.get_config(mask_key=False)
            api_key = current.get("api_key", "")

        cursor.execute("""
            UPDATE sys_ai_config 
            SET provider = %s,
                api_key = %s,
                base_url = %s,
                text_model = %s,
                vl_model = %s,
                temperature = %s,
                max_tokens = %s,
                system_prompt = %s
            WHERE id = (SELECT id FROM (SELECT id FROM sys_ai_config ORDER BY id DESC LIMIT 1) as t)
        """, (
            data.get("provider", "DEEPSEEK"),
            api_key or "",
            data.get("base_url", "https://api.deepseek.com/v1"),
            data.get("text_model", "deepseek-chat"),
            data.get("vl_model", "qwen-vl-max"),
            float(data.get("temperature", 0.3)),
            int(data.get("max_tokens", 2048)),
            data.get("system_prompt", "你是一名精通全国计算机考研408专业课的顶尖AI导师。")
        ))
        cursor.close()
        conn.close()

        # 同步更新运行内存
        cls._cached_config = None
        return cls.get_config(mask_key=True)

    @classmethod
    async def test_connection(cls, test_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """向配置的大模型 Base URL 发送真实测试请求，检验连通性与模型可用性"""
        cfg = test_data if test_data else cls.get_config(mask_key=False)
        api_key = cfg.get("api_key", "").strip()
        base_url = cfg.get("base_url", "https://api.deepseek.com/v1").rstrip("/")
        model = cfg.get("text_model", "deepseek-chat")

        if not api_key or "****" in api_key:
            current = cls.get_config(mask_key=False)
            api_key = current.get("api_key", "").strip()

        if not api_key:
            return {
                "success": False,
                "message": "请先填入有效的 API Key 再进行连通性测试",
                "latency_ms": 0,
                "response": None
            }

        start_time = time.time()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are an AI assistant."},
                {"role": "user", "content": "你好，请确认你的模型名称并回复：408 计算机考研 AI 引擎连接成功！"}
            ],
            "max_tokens": 60,
            "temperature": 0.1
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
                latency = round((time.time() - start_time) * 1000)

                if res.status_code == 200:
                    data = res.json()
                    reply = data["choices"][0]["message"]["content"]
                    return {
                        "success": True,
                        "message": f"连接成功！大模型响应正常（耗时 {latency}ms）",
                        "latency_ms": latency,
                        "model": model,
                        "reply": reply
                    }
                else:
                    return {
                        "success": False,
                        "message": f"模型接口返回 HTTP {res.status_code}: {res.text[:200]}",
                        "latency_ms": latency,
                        "error": res.text
                    }
        except httpx.TimeoutException:
            return {
                "success": False,
                "message": f"请求超时（超过 15 秒），请检查网络或 Base URL 是否可访问: {base_url}",
                "latency_ms": 15000
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"网络异常或无法连接目标接口: {str(e)}",
                "latency_ms": 0
            }

