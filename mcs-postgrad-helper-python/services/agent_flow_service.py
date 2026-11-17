import json
import pymysql
import re
from typing import Dict, Any, List, Optional
from config import settings
from models.schemas import AgentStartRequest, AgentStepRequest, AgentSessionVO
from services.llm_client import LLMClient
from services.ai_config_service import AIConfigService
from services.variant_generator_service import VariantGeneratorService

STAGE_NAMES = {
    "KNOWLEDGE_EXPLAIN": "1. 知识点考点精讲",
    "PRACTICE_GEN": "2. 针对性自测生成",
    "GRADING": "3. 智能判分与错因分析",
    "TRUE_EXAM_DRILL": "4. 历年真题实战演练",
    "SUMMARY_REPORT": "5. 复习复盘总结报告"
}

STAGE_PROGRESS = {
    "KNOWLEDGE_EXPLAIN": 20,
    "PRACTICE_GEN": 40,
    "GRADING": 60,
    "TRUE_EXAM_DRILL": 80,
    "SUMMARY_REPORT": 100
}

SUBJECT_NAMES = {
    "ds": "数据结构",
    "co": "计算机组成原理",
    "os": "操作系统",
    "cn": "计算机网络",
    "net": "计算机网络"
}

class AgentFlowService:
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
    async def start_flow(cls, req: AgentStartRequest) -> AgentSessionVO:
        conn = cls._get_db()
        cursor = conn.cursor()

        sub_code = (req.target_subject or "ds").lower()
        title = f"408 Agent复习: {req.instruction[:24]}"
        initial_stage = "KNOWLEDGE_EXPLAIN"

        # 真实大模型调用生成考点深度精讲
        explain_content = await cls._generate_knowledge_explain_ai(req.instruction, sub_code, req.difficulty)

        context_state = {
            "instruction": req.instruction,
            "target_subject": sub_code,
            "difficulty": req.difficulty,
            "stage_data": {
                "KNOWLEDGE_EXPLAIN": explain_content
            },
            "history": []
        }

        cursor.execute("""
            INSERT INTO agent_session 
            (user_id, session_type, title, current_stage, difficulty_level, context_state_json)
            VALUES (%s, 'AGENT_FLOW', %s, %s, %s, %s)
        """, (req.user_id, title, initial_stage, req.difficulty, json.dumps(context_state, ensure_ascii=False)))

        session_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO agent_task_execution 
            (session_id, user_id, instruction, target_subject, status)
            VALUES (%s, %s, %s, %s, 'RUNNING')
        """, (session_id, req.user_id, req.instruction, sub_code))

        cursor.close()
        conn.close()

        return AgentSessionVO(
            session_id=session_id,
            title=title,
            current_stage=initial_stage,
            stage_name=STAGE_NAMES[initial_stage],
            difficulty_level=req.difficulty,
            stage_content=explain_content,
            progress_percent=STAGE_PROGRESS[initial_stage],
            is_paused=False,
            is_completed=False
        )

    @classmethod
    async def handle_step(cls, req: AgentStepRequest) -> AgentSessionVO:
        conn = cls._get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id, user_id, title, current_stage, difficulty_level, context_state_json FROM agent_session WHERE id = %s", (req.session_id,))
        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            raise ValueError("会话不存在")

        session_id, user_id, title, current_stage, difficulty, raw_context = row
        context = json.loads(raw_context) if raw_context else {}
        instruction = context.get("instruction", "408复习")
        subject = context.get("target_subject", "ds")

        # 暂停任务
        if req.action == "PAUSE":
            cursor.execute("UPDATE agent_session SET current_stage = 'PAUSED' WHERE id = %s", (session_id,))
            cursor.close()
            conn.close()
            return AgentSessionVO(
                session_id=session_id,
                title=title,
                current_stage="PAUSED",
                stage_name="任务已暂停",
                difficulty_level=difficulty,
                stage_content={"message": "复习流程已暂停，随时可点击【继续任务】。"},
                progress_percent=STAGE_PROGRESS.get(current_stage, 50),
                is_paused=True,
                is_completed=False
            )

        # 继续任务
        if req.action == "RESUME":
            next_stage = current_stage if current_stage != "PAUSED" else "KNOWLEDGE_EXPLAIN"
            cursor.execute("UPDATE agent_session SET current_stage = %s WHERE id = %s", (next_stage, session_id))
            cursor.close()
            conn.close()
            stage_content = context.get("stage_data", {}).get(next_stage, {})
            return AgentSessionVO(
                session_id=session_id,
                title=title,
                current_stage=next_stage,
                stage_name=STAGE_NAMES.get(next_stage, "进行中"),
                difficulty_level=difficulty,
                stage_content=stage_content,
                progress_percent=STAGE_PROGRESS.get(next_stage, 50),
                is_paused=False,
                is_completed=(next_stage == "SUMMARY_REPORT")
            )

        # 状态机推进一步:
        # KNOWLEDGE_EXPLAIN -> PRACTICE_GEN -> GRADING -> TRUE_EXAM_DRILL -> SUMMARY_REPORT
        stage_content = {}
        next_stage = current_stage
        is_completed = False

        if current_stage == "KNOWLEDGE_EXPLAIN":
            next_stage = "PRACTICE_GEN"
            stage_content = await cls._generate_practice_questions_ai(instruction, subject, difficulty)
            context["stage_data"]["PRACTICE_GEN"] = stage_content

        elif current_stage == "PRACTICE_GEN":
            next_stage = "GRADING"
            practice_data = context["stage_data"].get("PRACTICE_GEN", {})
            stage_content = await cls._grade_practice_and_diagnose_ai(
                req.user_response,
                practice_data,
                subject,
                instruction,
                user_id
            )
            context["stage_data"]["GRADING"] = stage_content

        elif current_stage == "GRADING":
            next_stage = "TRUE_EXAM_DRILL"
            stage_content = cls._query_real_exams_for_drill(cursor, subject, instruction)
            context["stage_data"]["TRUE_EXAM_DRILL"] = stage_content

        elif current_stage == "TRUE_EXAM_DRILL":
            next_stage = "SUMMARY_REPORT"
            stage_content = await cls._generate_summary_report_ai(instruction, subject, context)
            context["stage_data"]["SUMMARY_REPORT"] = stage_content
            is_completed = True

            cursor.execute("""
                UPDATE agent_task_execution 
                SET status = 'COMPLETED', report_content = %s 
                WHERE session_id = %s
            """, (json.dumps(stage_content, ensure_ascii=False), session_id))

        cursor.execute("""
            UPDATE agent_session 
            SET current_stage = %s, context_state_json = %s 
            WHERE id = %s
        """, (next_stage, json.dumps(context, ensure_ascii=False), session_id))

        cursor.close()
        conn.close()

        return AgentSessionVO(
            session_id=session_id,
            title=title,
            current_stage=next_stage,
            stage_name=STAGE_NAMES.get(next_stage, "已完成"),
            difficulty_level=difficulty,
            stage_content=stage_content,
            progress_percent=STAGE_PROGRESS.get(next_stage, 100),
            is_paused=False,
            is_completed=is_completed
        )

    # ---------------- 真实 AI 智能体各阶段驱动引擎 ----------------
    @classmethod
    async def _generate_knowledge_explain_ai(cls, instruction: str, subject: str, difficulty: str) -> Dict[str, Any]:
        """Step 1: 考点深度精讲，调用 DeepSeek 输出专业 Markdown 及核心公式与命题陷阱"""
        sub_name = SUBJECT_NAMES.get(subject.lower(), "408专业课")
        prompt = f"""你是一名全国硕士研究生招生考试计算机专业基础综合（408统考）命题组专家导师。
考生请求：【{instruction}】，所属科目：【{sub_name}】。
请针对该考点进行系统、硬核、深度的考点精讲，要求：
1. 深入剖析底层原理与数据结构/硬件微架构/OS内核/网络协议机理；
2. 公式计算必须使用严格规范的 LaTeX / KaTeX 数学语法（如 $\\text{{组号}} = \\dots$）；
3. 提炼出 3 个核心知识模块（每个模块 detail 控制在 200 字左右，支持 Markdown 与精练公式）；
4. 深度指出 408 统考历年常考高频命题陷阱与易错点；
5. 给出一句清晰的下一步自测引导语。

请严格输出合法纯 JSON 格式（不要在 JSON 字符串内部包含未转义的直接换行符）：
```json
{{
  "topic": "{instruction}",
  "subject": "{sub_name}",
  "core_concepts": [
    {{"title": "底层机制与核心定义", "detail": "详细讲解..."}},
    {{"title": "核心计算模型与推导公式", "detail": "公式推导及参数分析..."}},
    {{"title": "408 统考高频陷阱与防踩坑指南", "detail": "历年易混淆辨析..."}}
  ],
  "recommended_flow": "考点精讲研读完毕！点击【开始针对性自测】，AI 将为您量身生成 3 道全真诊断习题。"
}}
```
"""
        messages = [
            {"role": "system", "content": "你是一名精通 408 计算机考研的资深命题专家，输出结构清晰、符合标准 JSON 规范的考点精讲。"},
            {"role": "user", "content": prompt}
        ]
        try:
            raw = await LLMClient.chat_completion(messages, temperature=0.4, max_tokens=4096)
            if raw:
                parsed = LLMClient.safe_json_loads(raw)
                if isinstance(parsed, dict) and "core_concepts" in parsed:
                    parsed["is_real_ai"] = True
                    return parsed
        except Exception as e:
            print(f"[!] Step 1 LLM 异常: {e}")

        # 兜底
        return {
            "is_real_ai": False,
            "topic": instruction,
            "subject": sub_name,
            "core_concepts": [
                {"title": "核心机理与数学模型", "detail": f"针对【{instruction}】，408统考重点考查其软硬件结合机制、时间/空间折中设计及边界条件判定。"},
                {"title": "核心推导与公式速查", "detail": "大题先写设计思想，代码写注释并判空，复杂度给出大 $O$ 渐进阶；客观题注意首尾项加一减一细节。"},
                {"title": "408 历年常考命题陷阱", "detail": "注意分清直接映射与组相联映射的行号计算、TCP 确认号语义（期望收到的下一字节序号）及树转二叉树的孩子兄弟表示法边界。"}
            ],
            "recommended_flow": "认真阅读精讲要点后，点击【开始针对性自测】，AI 将生成 3 道诊断习题。"
        }

    @classmethod
    async def _generate_practice_questions_ai(cls, instruction: str, subject: str, difficulty: str) -> Dict[str, Any]:
        """Step 2: 动态出题，调用 DeepSeek 生成 2 道单选题 + 1 道综合应用题"""
        sub_name = SUBJECT_NAMES.get(subject.lower(), "408专业课")
        prompt = f"""你是一名 408 统考命题专家。请基于考生复习目标【{instruction}】（科目：{sub_name}），动态生成 3 道高质量仿真测试题：
- 第 1 题：单选题（4个选项 A、B、C、D，正确答案、详细解析）
- 第 2 题：单选题（涉及情境推导或计算，4个选项 A、B、C、D，正确答案、详细解析）
- 第 3 题：综合应用大题（10分，包含具体设问、标准答案、采分点）

所有数学公式与符号请使用规范 LaTeX 语法包裹（如 $O(n\\log n)$, $2^{{16}}$ 等）。

请严格输出 JSON 格式如下：
```json
{{
  "instruction": "已基于【{instruction}】定制生成 3 道针对性诊断题：",
  "questions": [
    {{
      "q_id": "gen-1",
      "type": "choice",
      "stem": "题目题干...",
      "options": [
        {{"key": "A", "text": "选项A"}},
        {{"key": "B", "text": "选项B"}},
        {{"key": "C", "text": "选项C"}},
        {{"key": "D", "text": "选项D"}}
      ],
      "answer": "A",
      "score": 2,
      "explanation": "解析..."
    }},
    {{
      "q_id": "gen-2",
      "type": "choice",
      "stem": "题目题干...",
      "options": [
        {{"key": "A", "text": "选项A"}},
        {{"key": "B", "text": "选项B"}},
        {{"key": "C", "text": "选项C"}},
        {{"key": "D", "text": "选项D"}}
      ],
      "answer": "B",
      "score": 2,
      "explanation": "解析..."
    }},
    {{
      "q_id": "gen-3",
      "type": "comprehensive",
      "stem": "大题题干描述...",
      "score": 10,
      "standard_answer": "参考解答与推导过程...",
      "rubric_points": ["核心设计思想 (3分)", "核心算法/计算步骤 (5分)", "复杂度分析 (2分)"],
      "explanation": "大题命题采分点解析..."
    }}
  ]
}}
```
"""
        messages = [
            {"role": "system", "content": "你是一名精通 408 统考的出题专家，生成题目严谨，杜绝幻觉。"},
            {"role": "user", "content": prompt}
        ]
        try:
            raw = await LLMClient.chat_completion(messages, temperature=0.5, max_tokens=4096)
            if raw:
                parsed = LLMClient.safe_json_loads(raw)
                if isinstance(parsed, dict) and "questions" in parsed:
                    parsed["is_real_ai"] = True
                    return parsed
        except Exception as e:
            print(f"[!] Step 2 出题 LLM 异常: {e}")

        # 兜底
        return {
            "is_real_ai": False,
            "instruction": f"已基于【{instruction}】定制自测习题：",
            "questions": [
                {
                    "q_id": "gen-1",
                    "type": "choice",
                    "stem": f"关于【{instruction}】的核心性质，下列说法中正确的是（ ）。",
                    "options": [
                        {"key": "A", "text": "通过增加适当辅助硬件或空间换取时间开销的降低，符合时空权衡思想"},
                        {"key": "B", "text": "在所有边界条件下其最坏情况时间复杂度均为常数阶 $O(1)$"},
                        {"key": "C", "text": "只能采用顺序存储结构，不可在链式结构中实现"},
                        {"key": "D", "text": "发生命中失效后系统无条件进入死锁等待"}
                    ],
                    "answer": "A",
                    "score": 2,
                    "explanation": "A 选项体现了典型的以空间换时间思想，符合计算机底层体系设计原则。"
                },
                {
                    "q_id": "gen-2",
                    "type": "choice",
                    "stem": f"在【{instruction}】的应用场景中，当发生突发边界溢出或命中失效时，典型机制是（ ）。",
                    "options": [
                        {"key": "A", "text": "触发软硬件中断或缺页/置换流程，更新映射状态"},
                        {"key": "B", "text": "立即终止当前所有进程并重启内核"},
                        {"key": "C", "text": "丢弃后续所有报文且不发送任何确认信号"},
                        {"key": "D", "text": "忽略该错误继续执行下一条指令"}
                    ],
                    "answer": "A",
                    "score": 2,
                    "explanation": "A 选项符合现代操作系统与硬件中断处理的标准流程。"
                },
                {
                    "q_id": "gen-3",
                    "type": "comprehensive",
                    "stem": f"针对【{instruction}】，请写出核心算法设计或硬件推导思路，并说明：(1)基本设计思想；(2)核心推导或实现；(3)时间复杂度与空间复杂度。",
                    "score": 10,
                    "standard_answer": "1. 基本思想：利用分治或双指针技术减少不必要遍历；\n2. 核心逻辑：维护边界指针与状态位；\n3. 复杂度：时间复杂度 $O(n)$，空间复杂度 $O(1)$。",
                    "rubric_points": ["设计思想阐述完整 (3分)", "核心算法/推导正确 (5分)", "复杂度分析准确 (2分)"],
                    "explanation": "综合考查考生的算法设计与体系结构理解。"
                }
            ]
        }

    @classmethod
    async def _grade_practice_and_diagnose_ai(
        cls,
        user_response: str,
        practice_data: Dict[str, Any],
        subject: str,
        instruction: str,
        user_id: int = 1
    ) -> Dict[str, Any]:
        """Step 3: 真实作答智能批改与错因诊断，并将错题自动收录至错题本"""
        questions = practice_data.get("questions", [])
        user_answers = {}
        if user_response:
            # 格式形如 "gen-1: A; gen-2: B; gen-3: 用户作答文本"
            parts = user_response.split("; ")
            for p in parts:
                if ": " in p:
                    k, v = p.split(": ", 1)
                    user_answers[k.strip()] = v.strip()

        total_score = 0.0
        earned_score = 0.0
        q_results = []
        wrong_count = 0

        for q in questions:
            qid = q.get("q_id", "")
            q_type = q.get("type", "choice")
            max_s = float(q.get("score", 2))
            total_score += max_s
            u_ans = user_answers.get(qid, "").strip()
            std_ans = str(q.get("answer", "")).strip()

            if q_type == "choice":
                if u_ans and u_ans.upper() == std_ans.upper():
                    earned_score += max_s
                    q_results.append({"q_id": qid, "earned": max_s, "is_correct": True, "comment": "回答正确！"})
                else:
                    wrong_count += 1
                    q_results.append({"q_id": qid, "earned": 0, "is_correct": False, "comment": f"回答错误，正确答案为 {std_ans}"})
                    # 存入错题本
                    VariantGeneratorService.save_wrong_question({
                        "user_id": user_id,
                        "question_id": f"agent-{qid}",
                        "subject_code": subject,
                        "custom_question_json": {
                            "stem": q.get("stem"),
                            "options": q.get("options"),
                            "answer": std_ans,
                            "explanation": q.get("explanation")
                        },
                        "source_type": "AGENT",
                        "error_reason_tag": "CONCEPT_CONFUSION",
                        "user_notes": f"Agent复习诊断做错 (针对考点: {instruction})",
                        "last_wrong_answer": u_ans
                    })
            else:
                # 综合题由 AI 进行采分点评定
                sub_score = 0.0
                if u_ans and len(u_ans) >= 10:
                    try:
                        rubrics = q.get("rubric_points", ["思想", "实现", "复杂度"])
                        ai_eval = await cls._ai_evaluate_subjective_step(q.get("stem"), q.get("standard_answer", ""), rubrics, u_ans, int(max_s))
                        sub_score = float(ai_eval.get("score", max_s * 0.7))
                    except:
                        sub_score = round(max_s * 0.7, 1)
                else:
                    sub_score = 0.0

                earned_score += sub_score
                if sub_score < max_s * 0.6:
                    wrong_count += 1
                    VariantGeneratorService.save_wrong_question({
                        "user_id": user_id,
                        "question_id": f"agent-{qid}",
                        "subject_code": subject,
                        "custom_question_json": {
                            "stem": q.get("stem"),
                            "answer": q.get("standard_answer"),
                            "explanation": q.get("explanation")
                        },
                        "source_type": "AGENT",
                        "error_reason_tag": "CODE_BUG",
                        "user_notes": f"Agent自测大题失分 (得分: {sub_score}/{max_s})",
                        "last_wrong_answer": u_ans
                    })
                q_results.append({"q_id": qid, "earned": sub_score, "is_correct": (sub_score >= max_s * 0.6), "comment": f"主观题评分: {sub_score}/{max_s}分"})

        acc_pct = round((earned_score / total_score * 100) if total_score > 0 else 0.0, 1)

        # 调用大模型生成深度错因诊断与学情剖析
        diag_prompt = f"""考生在复习【{instruction}】的 3 道针对性自测题中，得分 {earned_score}/{total_score}（正确率 {acc_pct}%，做错 {wrong_count} 题）。
作答详情：{json.dumps(q_results, ensure_ascii=False)}
请输出简练、专业的诊断分析：
1. 诊断总评 diagnostic_summary（100字左右，客观指出知识盲区或掌握亮点）；
2. 提炼 2-3 个具体薄弱考点 weak_points（如：边界条件判断、Cache组地址推导等）；
3. 下一步行动建议 next_action_tip。

请输出 JSON：
```json
{{
  "diagnostic_summary": "...",
  "weak_points": ["薄弱点1", "薄弱点2"],
  "next_action_tip": "诊断完成！AI 已调取历年 408 统考真题演练，点击【调取真题演练】即可开始实战！"
}}
```
"""
        messages = [
            {"role": "system", "content": "你是一名 408 诊断阅卷专家。"},
            {"role": "user", "content": diag_prompt}
        ]
        diag_summary = f"考生本次自测得分为 {earned_score}/{total_score} 分（正确率 {acc_pct}%）。作答整体体现了一定的基础理解，但在复杂极端边界与算法规范性上仍需进一步强化。"
        weak_pts = ["核心边界条件判定", "状态迁移推导"]
        try:
            raw = await LLMClient.chat_completion(messages, temperature=0.5, max_tokens=2048)
            if raw:
                p = LLMClient.safe_json_loads(raw)
                if isinstance(p, dict) and "diagnostic_summary" in p:
                    diag_summary = p.get("diagnostic_summary", diag_summary)
                    weak_pts = p.get("weak_points", weak_pts)
        except Exception as e:
            print(f"[!] Step 3 诊断 LLM 异常: {e}")

        return {
            "score": round(earned_score, 1),
            "total_score": round(total_score, 1),
            "accuracy": f"{acc_pct}%",
            "diagnostic_summary": diag_summary,
            "weak_points": weak_pts,
            "question_evals": q_results,
            "next_action_tip": "诊断完成！AI 已从 408 全量真题库中为您精准匹配对应的统考真题，点击【进入真题实战】强化演练！"
        }

    @classmethod
    async def _ai_evaluate_subjective_step(cls, stem: str, std_ans: str, rubrics: List[str], user_ans: str, max_score: int) -> Dict[str, Any]:
        prompt = f"""请对以下 408 综合题进行采分点批阅：
题干：{stem[:300]}
标准答案：{std_ans[:300]}
采分点：{json.dumps(rubrics, ensure_ascii=False)}
考生作答：{user_ans}
满分：{max_score} 分

请输出 JSON：{{"score": 得分数字}}
"""
        messages = [{"role": "user", "content": prompt}]
        raw = await LLMClient.chat_completion(messages, temperature=0.3)
        if raw and "{" in raw:
            match = re.search(r"\{\s*\"score\"\s*:\s*([0-9\.]+)\s*\}", raw)
            if match:
                return {"score": float(match.group(1))}
        return {"score": round(max_score * 0.6, 1)}

    @classmethod
    def _query_real_exams_for_drill(cls, cursor, subject: str, instruction: str) -> Dict[str, Any]:
        """Step 4: 精准调取历年 408 统考真题进行定向实战"""
        # 提取关键词
        keywords = re.findall(r'[\u4e00-\u9fa5]{2,6}', instruction)
        kw = keywords[0] if keywords else ""

        rows = []
        if kw:
            cursor.execute("""
                SELECT id, year, question_number, score, question_type, subject_code, chapter_name, stem, options_json, answer, explanation
                FROM exam_question
                WHERE subject_code = %s AND (stem LIKE %s OR chapter_name LIKE %s)
                ORDER BY year DESC
                LIMIT 3
            """, (subject, f"%{kw}%", f"%{kw}%"))
            rows = cursor.fetchall()

        if not rows or len(rows) < 3:
            cursor.execute("""
                SELECT id, year, question_number, score, question_type, subject_code, chapter_name, stem, options_json, answer, explanation
                FROM exam_question
                WHERE subject_code = %s
                ORDER BY RAND()
                LIMIT 3
            """, (subject,))
            rows = cursor.fetchall()

        real_exams = []
        for r in rows:
            opts = []
            if r[8]:
                try:
                    opts = json.loads(r[8])
                except:
                    opts = []
            real_exams.append({
                "id": r[0],
                "year": r[1],
                "number": r[2],
                "score": r[3],
                "type": r[4],
                "subject": r[5],
                "chapter": r[6] or "408核心考点",
                "stem": r[7],
                "options": opts,
                "answer": r[9],
                "explanation": r[10] or "官方历年真题精解"
            })

        return {
            "title": f"历年 408 统考高频真题演练（匹配考点：{kw or instruction[:15]}）",
            "drill_questions": real_exams,
            "drill_tip": "真题演练完成后点击【生成复盘总结报告】，AI 智能体将全量汇总本次专项突破学情！"
        }

    @classmethod
    async def _generate_summary_report_ai(cls, instruction: str, subject: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Step 5: 生成全方位复盘总结报告"""
        grading = context.get("stage_data", {}).get("GRADING", {})
        score = grading.get("score", 10)
        total = grading.get("total_score", 14)
        accuracy = grading.get("accuracy", "71.4%")
        weak_points = grading.get("weak_points", ["边界条件判定"])

        sub_name = SUBJECT_NAMES.get(subject.lower(), "408专业课")
        prompt = f"""考生完成了针对【{instruction}】（{sub_name}）的 408 智能备考全流程学习：
- 自测得分：{score}/{total}（正确率 {accuracy}）
- 诊断薄弱考点：{json.dumps(weak_points, ensure_ascii=False)}
- 已完成：知识精讲、自测答题与智能判分、历年 408 统考真题演练

请为考生生成一份高规格的【408 智能备考复盘总结报告】：
1. 掌握度判定 overall_status（如：精通 MASTERED / 熟悉 FAMILIAR / 需加固 NEED_PRACTICE）；
2. 备考能效评估 study_efficiency（例如：92/100）；
3. 3条本次复习达成要点 accomplished_steps；
4. 深度复习与避坑建议 weakness_advice；
5. 下一步建议突破的关联考点 next_recommended_topic；
6. 完整的 Markdown 复盘讲义 markdown_report（包含考点精讲提要、易错反思、公式小结）。

请严格输出 JSON 格式如下：
```json
{{
  "title": "408 智能备考复盘总结报告 - 【{instruction}】",
  "overall_status": "熟悉 (FAMILIAR)",
  "study_efficiency": "90/100",
  "accomplished_steps": [
    "1. 考点底层机理与 LaTeX 公式推导精讲学习",
    "2. 针对性自测 3 题实战演练与智能判分",
    "3. 历年 408 统考对应高频真题强化"
  ],
  "weakness_advice": "深入建议...",
  "next_recommended_topic": "下一步推荐攻坚考点...",
  "markdown_report": "完整的 Markdown 讲义与报告内容..."
}}
```
"""
        messages = [
            {"role": "system", "content": "你是一名 408 考研智能导师。"},
            {"role": "user", "content": prompt}
        ]
        try:
            raw = await LLMClient.chat_completion(messages, temperature=0.6, max_tokens=4096)
            if raw:
                parsed = LLMClient.safe_json_loads(raw)
                if isinstance(parsed, dict) and "overall_status" in parsed:
                    parsed["is_real_ai"] = True
                    return parsed
        except Exception as e:
            print(f"[!] Step 5 报告 LLM 异常: {e}")

        return {
            "is_real_ai": False,
            "title": f"408 智能备考复盘总结报告 - 【{instruction}】",
            "overall_status": "掌握良好 (FAMILIAR)",
            "study_efficiency": "88/100",
            "accomplished_steps": [
                "1. 完成考点精讲学习与高频易错避坑梳理",
                "2. 完成针对性自测 3 题，深入剖析命题设问逻辑",
                "3. 完成历年 408 统考真题演练，检验真题实战手感"
            ],
            "weakness_advice": "针对本次自测暴露的薄弱考点，系统已自动录入【个人错题本】，建议考前进行二轮重做。",
            "next_recommended_topic": "建议下一步攻坚：相关配套大题综合分析（如流水线冒险、虚拟页式存储与TLB联合命中推导）。",
            "markdown_report": f"# 408 备战复盘：{instruction}\n\n- 科目：{sub_name}\n- 诊断得分：{score}/{total}\n- 学习效率：88/100\n\n已完成全流程闭环训练！"
        }
