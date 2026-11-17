import json
import pymysql
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from config import settings
from models.schemas import QARequest, QAResponse
from services.qa_service import QAService
from services.llm_client import LLMClient
from services.ai_config_service import AIConfigService

router = APIRouter(prefix="/api/ai", tags=["图文问答与流式伴学"])

class StreamChatRequest(BaseModel):
    question: str
    subject: Optional[str] = None
    is_socratic: Optional[bool] = False  # 是否为分步启发式辅导模式（参考视频01:48）
    context_doc: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []

class NoteSummaryRequest(BaseModel):
    title: str
    content: str
    subject: Optional[str] = None

class WrongDiagnosisRequest(BaseModel):
    question_id: str
    subject: Optional[str] = "DS"
    stem: Optional[str] = ""
    answer: Optional[str] = ""
    explanation: Optional[str] = ""
    user_notes: Optional[str] = ""
    wrong_count: Optional[int] = 1

@router.post("/diagnose-wrong")
async def diagnose_wrong(req: WrongDiagnosisRequest):
    """错题医生：基于题干、答案与用户笔记做真实归因。"""
    prompt = f"""你是一名 408 考研阅卷老师，请诊断下面这道错题。
科目：{req.subject}
题干：{req.stem[:1500]}
标准答案：{req.answer[:800]}
解析：{req.explanation[:1500]}
用户错题笔记：{req.user_notes[:800]}
错误次数：{req.wrong_count}

请用 Markdown 输出，包含：
1. 错因归因（概念混淆/计算失误/边界遗漏/算法缺陷，必须具体到本题）
2. 正确解题路径（3-5 步）
3. 408 采分点提醒
4. 下一步补救任务（具体到做什么题、看哪一节）
不要编造题干中没有的信息。"""
    diagnosis = await LLMClient.chat_completion(
        messages=[
            {"role": "system", "content": "你是严谨的 408 考研错题诊断老师。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=2000,
    )
    if not diagnosis:
        diagnosis = f"### 错因归因\n本题错误 {req.wrong_count} 次，建议重点检查「{req.subject}」相关概念与边界条件。\n\n### 正确解题路径\n1. 重新读题干，标出条件与所求。\n2. 对照标准答案逐步复现。\n3. 写出关键公式/代码。\n\n### 408 采分点\n结论先行、公式代入、单位与复杂度说明。\n\n### 补救任务\n完成 3 道同类变式题，并复盘错题本中的相关考点。"
    return {
        "code": 200,
        "message": "错题诊断完成",
        "data": {
            "rootCause": diagnosis,
            "targetPoint": req.subject,
            "remedialTask": "完成 3 道同类变式题 + 复盘 1 篇相关讲义",
            "remedySubject": req.subject,
        },
    }

@router.post("/summarize-note")
async def summarize_note(req: NoteSummaryRequest):
    """把用户笔记压缩成 408 考前速记卡片。"""
    prompt = f"""请把下面这篇 408 考研笔记压缩成一张考前速记卡片。
要求：
1. 保留核心定义、公式、易错点和解题步骤；
2. 用 Markdown 输出，包含「核心结论」「关键公式/步骤」「易错点」三部分；
3. 不超过 300 字，不要编造笔记中没有的内容。

笔记标题：{req.title}
笔记内容：
{req.content[:6000]}"""
    summary = await LLMClient.chat_completion(
        messages=[
            {"role": "system", "content": "你是 408 考研阅卷老师，擅长把长笔记压缩成考前速记。"},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    if not summary:
        summary = "### 核心结论\n" + (req.content[:160] or "笔记内容为空") + "\n\n### 关键公式/步骤\n请结合原笔记复习。\n\n### 易错点\n请重点回顾真题中的边界条件与概念辨析。"
    return {"code": 200, "message": "笔记摘要生成完成", "data": {"summary": summary.strip()}}

@router.post("/qa")
async def answer_qa(req: QARequest):
    try:
        response = await QAService.answer_question(req)
        return {
            "code": 200,
            "message": "问答完成",
            "data": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def stream_chat(req: StreamChatRequest):
    """
    408 考研智能伴学流式输出接口 (SSE Server-Sent Events)
    支持：
    1. 真实大模型 Token 级流式打字机推送
    2. RAG 知识库切片上下文动态检索注入与出处溯源
    3. 分步启发式伴学模式 (is_socratic: True) vs 深度权威解答模式 (is_socratic: False)
    """
    async def event_generator():
        # 1. 尝试检索知识库作为 RAG Context
        kb_context = ""
        citation_info = []
        try:
            conn = pymysql.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME,
                charset="utf8mb4",
                autocommit=True
            )
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            words = [w.strip() for w in req.question.split() if len(w.strip()) > 1]
            if not words:
                words = [req.question[:15]]
            
            sql = """
                SELECT c.id as chunk_id, c.content, c.page_number, d.title as doc_title, d.subject_code
                FROM kb_chunk c
                JOIN kb_document d ON c.document_id = d.id
                WHERE 1=1
            """
            params = []
            if req.subject and req.subject != "ALL":
                sql += " AND d.subject_code = %s"
                params.append(req.subject.upper())
            
            or_conds = ["c.content LIKE %s" for _ in words]
            sql += f" AND ({' OR '.join(or_conds)}) LIMIT 3"
            for w in words:
                params.append(f"%{w}%")
                
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            if rows:
                chunks = []
                for r in rows:
                    chunks.append(f"《{r['doc_title']}》第{r['page_number']}页切片: {r['content']}")
                    citation_info.append({
                        "doc_title": r["doc_title"],
                        "page": r["page_number"]
                    })
                kb_context = "\n".join(chunks)
        except Exception as e:
            print(f"[!] RAG 上下文检索异常: {e}")

        # 发送溯源资料事件
        if citation_info:
            yield f"data: {json.dumps({'citations': citation_info}, ensure_ascii=False)}\n\n"

        # 2. 构造 System Prompt 人设
        cfg = AIConfigService.get_config(mask_key=False)
        base_system = cfg.get("system_prompt", "你是一名精通全国计算机考研408专业课的顶尖AI伴学导师。")

        if req.is_socratic:
            system_prompt = (
                f"{base_system}\n"
                "【教学模式】：当前处于【分步启发式伴学模式】（Socratic Tutoring）。\n"
                "教学原则：\n"
                "1. 严禁直接给出最终答案或完整题解代码！\n"
                "2. 先引导学生梳理第一步的核心前置条件、状态转移或公式概念；\n"
                "3. 提出一个关键的引导性小问题，等待学生思考并给出回答后再推进下一步；\n"
                "4. 语气亲切温和，鼓励学生自主推导与验证。"
            )
        else:
            system_prompt = (
                f"{base_system}\n"
                "【教学模式】：当前处于【深度权威解答与真题剖析模式】。\n"
                "排版与语法核心铁律（违反将直接导致学员客户端排版崩溃）：\n"
                "1. 逻辑严密、层次清晰，优先给出考点核心定义或算法原理；\n"
                "2. 每一个 Markdown 标题（#、##、###）、段落、列表、表格和引用块前后必须强制保留空行（即连续两个换行符 \\n\\n），严禁将不同层级的标题、表格或列表连缀挤压在同一行；表格每行必须以单独换行符 \\n 独立成行，严禁在一行内连续放置多个表格行（如严禁出现 || 或 | |）；\n"
                "3. 数学公式与复杂度必须使用严格标准的 LaTeX 语法：行内公式务必且严格用成对的单个美元符号包裹（如 $WPL = \\sum w_i l_i$，$O(n \\log n)$）；独立块级公式或核心推导盒务必用成对的双美元符号包裹在独立行（如 $$\\boxed{...}$$），严禁遗漏开头的美元符号；公式内部严禁出现破坏语法的空行；\n"
                "4. 如有相关参考切片，明确指出《出处》与页码；\n"
                "5. 重点提示 408 统考历年命题陷阱与易错点（如字节/字编址区别、前缀编码唯一性、LRU替换等）。"
            )

        messages = [{"role": "system", "content": system_prompt}]

        # 历史多轮对话
        if req.history:
            for h in req.history[-6:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

        # 用户当前提问
        user_content = req.question
        if kb_context:
            user_content = f"【参考考纲知识切片】：\n{kb_context}\n\n【学员提问】：{req.question}"
        messages.append({"role": "user", "content": user_content})

        # 3. 调用真实大模型执行流式推送
        async for chunk in LLMClient.stream_chat_completion(messages):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
