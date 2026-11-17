import json
import re
import httpx
from typing import Dict, Any, List, Optional
from services.ai_config_service import AIConfigService

class LLMClient:
    """统一大模型与多模态调用客户端 (OpenAI-compatible)"""

    @classmethod
    def safe_json_loads(cls, raw: str) -> Any:
        """安全解析含有 Markdown 代码块和 LaTeX 反斜杠的大模型 JSON 输出"""
        if not raw:
            raise ValueError("Empty JSON string")
        text = raw.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        # 优先直接解析
        try:
            return json.loads(text, strict=False)
        except Exception:
            pass

        # 修复 LaTeX 语法导致的非法转义
        try:
            text = re.sub(r'\\(frac|text|times|theta|tau|phi|omega|alpha|beta|gamma|delta|le|ge|neq|approx|sim|quad|qquad|lfloor|rfloor|lceil|rceil|pmod|bmod|dots|cdots)', r'\\\\\1', text)
            cleaned = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', text)
            return json.loads(cleaned, strict=False)
        except Exception as e:
            # 去除可能未闭合的尾部或杂质
            cleaned = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', text)
            return json.loads(cleaned, strict=False)

    @classmethod
    async def chat_completion(
        cls, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None, 
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """执行通用大模型文本补全"""
        cfg = AIConfigService.get_config(mask_key=False)
        api_key = cfg.get("api_key", "").strip()
        base_url = cfg.get("base_url", "https://api.deepseek.com/v1").rstrip("/")
        use_model = model or cfg.get("text_model", "deepseek-chat")
        use_temp = temperature if temperature is not None else float(cfg.get("temperature", 0.3))
        use_max_tokens = max_tokens or int(cfg.get("max_tokens", 2048))

        if not api_key:
            return None

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": use_model,
            "messages": messages,
            "temperature": use_temp,
            "max_tokens": use_max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"[!] LLM API 调用失败 HTTP {resp.status_code}: {resp.text[:200]}")
                    return None
        except Exception as e:
            print(f"[!] LLM Client 请求异常: {e}")
            return None

    @classmethod
    async def stream_chat_completion(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ):
        """流式大模型生成器 (SSE / Chunk stream)"""
        cfg = AIConfigService.get_config(mask_key=False)
        api_key = cfg.get("api_key", "").strip()
        base_url = cfg.get("base_url", "https://api.deepseek.com/v1").rstrip("/")
        use_model = model or cfg.get("text_model", "deepseek-chat")
        use_temp = temperature if temperature is not None else float(cfg.get("temperature", 0.3))
        use_max_tokens = max_tokens or int(cfg.get("max_tokens", 2048))

        if not api_key:
            yield f"data: {json.dumps({'content': '【系统提示】：请先在管理员后台配置有效的 AI 模型 API Key。'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": use_model,
            "messages": messages,
            "temperature": use_temp,
            "max_tokens": use_max_tokens,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", f"{base_url}/chat/completions", headers=headers, json=body) as resp:
                    if resp.status_code != 200:
                        err_text = await resp.aread()
                        err_msg = err_text.decode("utf-8", errors="ignore")[:150]
                        yield f"data: {json.dumps({'content': '【模型调用错误 HTTP ' + str(resp.status_code) + '】: ' + err_msg}, ensure_ascii=False)}\n\n"
                        yield "data: [DONE]\n\n"
                        return

                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        if line == "data: [DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        if line.startswith("data: "):
                            raw_json = line[6:]
                            try:
                                chunk = json.loads(raw_json)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"
                            except Exception:
                                pass
        except Exception as e:
            yield f"data: {json.dumps({'content': f'【请求异常】: {str(e)}'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    @classmethod
    async def multimodal_vision_completion(
        cls,
        prompt: str,
        image_base64: Optional[str] = None,
        subject_hint: Optional[str] = None
    ) -> Optional[str]:
        """执行真实多模态视觉大模型解析 (Vision LLM)"""
        cfg = AIConfigService.get_config(mask_key=False)
        api_key = cfg.get("api_key", "").strip()
        base_url = cfg.get("base_url", "https://api.deepseek.com/v1").rstrip("/")
        # 若是 DeepSeek 官方接口，DeepSeek 不支持外部模型名 qwen-vl-max，需回退至 text_model
        if "deepseek" in base_url.lower():
            vl_model = cfg.get("text_model", "deepseek-chat")
        else:
            vl_model = cfg.get("vl_model", "qwen-vl-max") or cfg.get("text_model", "deepseek-chat")

        if not api_key:
            return None

        # 构造多模态内容 payload
        user_content = []
        user_content.append({"type": "text", "text": prompt})

        if image_base64:
            clean_b64 = image_base64
            if not clean_b64.startswith("data:"):
                clean_b64 = f"data:image/jpeg;base64,{clean_b64}"
            user_content.append({
                "type": "image_url",
                "image_url": {"url": clean_b64}
            })

        system_instruction = (
            "你是一名全国硕士研究生招生考试计算机专业基础综合（408统考）的顶尖多模态AI导师。\n"
            "用户提供了一张专业课原理图、时序图、数据通路图、树结构图、流程图或真题截图。\n"
            "请对图片内容进行视觉识别、文字提取 (OCR)、考点归属判定，并输出结构化解析与解题步骤。\n"
            "必须输出符合标准的 JSON 格式：\n"
            "{\n"
            '  "diagram_type": "TIMING_OR_ARCHITECTURE/TREE_OR_GRAPH/PROCESS_OR_MEMORY_FLOW/NETWORK_TOPOLOGY",\n'
            '  "identified_subject": "DS/CO/OS/NET",\n'
            '  "subject_name": "学科名称(如计算机组成原理)",\n'
            '  "knowledge_point": "具体考点名称",\n'
            '  "extracted_content": "图片内容文字与组件提取说明",\n'
            '  "analysis_summary": "考点底层原理深度剖析",\n'
            '  "solution_steps": ["第1步...", "第2步...", "第3步..."],\n'
            '  "exam_tips": "历年408命题陷阱预警",\n'
            '  "hallucination_check": "大纲考点校验依据"\n'
            "}"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_content if image_base64 else prompt}
        ]

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": vl_model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 2048
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=body)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"[!] Vision LLM API 调用失败 HTTP {resp.status_code}: {resp.text[:200]}")
                    return None
        except Exception as e:
            print(f"[!] Vision LLM 请求异常: {e}")
            return None
