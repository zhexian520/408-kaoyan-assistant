"""
408 真题考点变式练习题生成服务 (AI Dynamic Variant Question Generator)
基于用户所选具体真题的题干、选项、答案与解析，调用 DeepSeek 大模型实时动态生成高仿真变式题
支持复杂图片/图表智能转换为 Markdown表格 / Mermaid图 / ASCII图 / KaTeX数学公式
"""

import json
import random
import re
import pymysql
from typing import Dict, Any, Optional, List
from config import settings
from services.llm_client import LLMClient
from services.ai_config_service import AIConfigService

SUBJECT_MAP = {
    "DS": "数据结构",
    "CO": "计算机组成原理",
    "OS": "操作系统",
    "CN": "计算机网络",
    "NET": "计算机网络"
}

class VariantGeneratorService:

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
    async def generate_variant_question(
        cls,
        base_question_id: Optional[str] = None,
        subject_code: Optional[str] = "DS",
        base_stem: Optional[str] = None,
        base_options: Optional[List[Dict[str, Any]]] = None,
        base_answer: Optional[str] = None,
        base_explanation: Optional[str] = None,
        question_type: Optional[str] = None,
        year: Optional[int] = None,
        question_number: Optional[int] = None,
        chapter_name: Optional[str] = None,
        variation_mode: Optional[str] = "REVERSE_PARAMETER"
    ) -> Dict[str, Any]:
        """
        基于特定真题实时动态生成考点变式练习题
        """
        sub_code = (subject_code or "DS").upper()
        if sub_code == "CN":
            sub_code = "NET"
        # 数据库中的网络科目编码是 CN，展示层使用 NET，查询时必须分开
        db_sub_code = "CN" if sub_code == "NET" else sub_code
        subject_name = SUBJECT_MAP.get(sub_code, "408专业课")

        # 知识点模式：课程中心/知识图谱跳转时只传知识点标题，没有原题答案。
        # 该模式绝不能随机抽取其他章节真题，否则会出现“线性表变式生成 Cache 题”的跑题问题。
        kp_title = (base_stem or "").strip()
        is_kp_mode = str(base_question_id or "").startswith("kp-") or (
            bool(kp_title)
            and len(kp_title) <= 60
            and "\n" not in kp_title
            and not base_answer
            and not base_options
        )
        kp_chapter = (chapter_name or "").strip()
        reference_row = None

        # 兼容每日补给/Agent 自测等来源传入的字符串选项
        if base_options:
            normalized_options: List[Dict[str, Any]] = []
            for idx, opt in enumerate(base_options):
                if isinstance(opt, dict):
                    normalized_options.append(opt)
                else:
                    text = str(opt).strip()
                    text = re.sub(r"^[A-Za-z][.、:：]\s*", "", text)
                    key = chr(65 + idx) if idx < 26 else str(idx + 1)
                    normalized_options.append({"key": key, "text": text})
            base_options = normalized_options

        # 1. 补齐原题上下文：知识点模式只查同章节参考题；普通模式才按原题 ID 查询
        if is_kp_mode:
            try:
                conn = cls._get_db()
                cur = conn.cursor()
                if kp_title:
                    resolved_chapter = cls._resolve_kp_chapter(cur, db_sub_code, kp_title)
                    if resolved_chapter:
                        kp_chapter = resolved_chapter
                if kp_chapter:
                    cur.execute("""
                        SELECT id, year, question_number, score, question_type, subject_code, chapter_name, stem, options_json, answer, explanation
                        FROM exam_question
                        WHERE UPPER(subject_code) = %s
                          AND chapter_name = %s
                          AND LOWER(question_type) LIKE '%%choice%%'
                        ORDER BY RAND()
                        LIMIT 300
                    """, (db_sub_code, kp_chapter))
                    rows = list(cur.fetchall())
                    if rows:
                        # 优先挑题干本身就命中该知识点的参考题，避免同章节但不同小节的题
                        kp_keywords = cls._kp_keywords(kp_title, kp_chapter)
                        matched = [
                            row for row in rows
                            if any(k and k in (row[7] or "") for k in kp_keywords)
                        ]
                        reference_row = random.choice(matched or rows)
                cur.close()
                conn.close()
            except Exception as e:
                print(f"[!] 知识点章节定位异常: {e}")
        elif not base_stem or not base_answer:
            # 没有原题 ID 且没有题干时，绝不允许随机抽题生成“无主变式”
            if not base_question_id and not (base_stem or "").strip():
                raise ValueError("请先选择一道原题或知识点，再生成变式题")
            if base_question_id:
                try:
                    conn = cls._get_db()
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT id, year, question_number, score, question_type, subject_code, chapter_name, stem, options_json, answer, explanation
                        FROM exam_question
                        WHERE id = %s
                    """, (base_question_id,))
                    row = cur.fetchone()
                    if row:
                        base_question_id = row[0]
                        year = row[1]
                        question_number = row[2]
                        question_type = row[4]
                        base_stem = row[7]
                        if row[8]:
                            try:
                                base_options = json.loads(row[8])
                            except:
                                base_options = []
                        base_answer = row[9]
                        base_explanation = row[10]
                        chapter_name = row[6]
                    cur.close()
                    conn.close()
                except Exception as e:
                    print(f"[!] 查询原题库异常: {e}")

        if not is_kp_mode and not (base_stem or "").strip():
            raise ValueError("未找到对应的原题，请重新选择母题")

        # 整理原题信息文本
        if is_kp_mode:
            # 知识点模式：题干就是知识点标题，参考题只用于对齐难度，不覆盖知识点
            if not question_type:
                question_type = "SINGLE_CHOICE"
            orig_year_num = f"知识点「{kp_title}」"
            orig_stem_clean = kp_title or "408 核心考点"
            orig_options_text = ""
            orig_answer_text = ""
            orig_exp_text = ""
            chapter_val = kp_chapter or kp_title or "408核心考点"
            reference_stem = ""
            reference_answer = ""
            reference_exp = ""
            if reference_row:
                reference_stem = (reference_row[7] or "").strip()
                if reference_row[8]:
                    try:
                        ref_options = json.loads(reference_row[8])
                        base_options = ref_options
                        for opt in ref_options:
                            orig_options_text += f"{opt.get('key', '')}. {opt.get('text', '')}\n"
                    except Exception:
                        pass
                reference_answer = (reference_row[9] or "").strip()
                reference_exp = (reference_row[10] or "").strip()
            reference_block = "（题库中暂无同章节参考题，请直接依据 408 考纲与该知识点命题）"
            if reference_stem:
                reference_block = (
                    f"题干：{reference_stem[:700]}\n"
                    f"答案：{reference_answer or '略'}\n"
                    f"解析：{reference_exp[:350] or '略'}"
                )
        else:
            orig_year_num = f"{year or '历年'}年统考第{question_number or '某'}题"
            orig_stem_clean = (base_stem or "408 核心考点综合题").strip()
            orig_options_text = ""
            if base_options:
                orig_options_text = "\n".join([f"{opt.get('key', '')}. {opt.get('text', '')}" for opt in base_options])
            orig_answer_text = (base_answer or "见参考答案").strip()
            orig_exp_text = (base_explanation or "408 核心真题推导").strip()
        is_choice = True if (question_type and "CHOICE" in question_type.upper()) else False

        config = AIConfigService.get_config(mask_key=False)
        api_key = config.get("api_key", "").strip()

        # 2. 调用大模型实时动态生成
        if api_key:
            try:
                type_desc = "单项选择题（4个选项 A、B、C、D，仅一个正确）" if is_choice else "综合应用大题（2-3个小问，配详细采分点）"
                variant_type_val = "SINGLE_CHOICE" if is_choice else "COMPREHENSIVE"
                score_val = 2 if is_choice else 10
                chapter_val = (
                    (kp_chapter or kp_title or "408核心考点")
                    if is_kp_mode
                    else (chapter_name or "408核心考点")
                )
                options_or_subs_example = '"options": [{"key": "A", "text": "选项A内容"}, {"key": "B", "text": "选项B内容"}, {"key": "C", "text": "选项C内容"}, {"key": "D", "text": "选项D内容"}],' if is_choice else '"sub_questions": [{"sub_index": 1, "question": "第1小问", "score": 5, "standard_answer": "解答", "rubric_points": ["采分点1 (2分)", "采分点2 (3分)"]}],'
                ans_hint = "正确选项字母(如 B)" if is_choice else "大题标准综合解答"

                if is_kp_mode:
                    prompt = f"""你是一名全国硕士研究生招生考试计算机专业基础综合（408统考）命题专家。
考生正在课程中心按知识点做专项变式训练。

=============================================
【本次命题范围（最高优先级，严禁越界）】
- 科目：{subject_name}（{sub_code}）
- 所属章节：{chapter_val}
- 目标知识点：{kp_title}
=============================================

【硬性约束】
1. 只能围绕「{kp_title}」命题，考查该知识点的定义、性质、典型操作、复杂度、边界条件与 408 常见考法。
2. 严禁出现该章节之外的内容。例如知识点属于线性表时，不得出现 Cache、页面置换、进程调度、TCP、排序、图等无关内容。
3. 题干、选项与解析都必须使用该知识点的术语，题干中必须明确出现「{kp_title}」或其同义核心词（如线性表可用顺序表、链表、有序表等）。
4. 变式必须完整自洽：所有参数、指针关系、下标边界都要给出，不能依赖原题图片。
5. 下方【同章节参考真题】只用于对齐 408 难度与命题风格，不得照抄，也不得改变知识点范围。

【同章节参考真题（仅作风格参考）】
{reference_block}

【任务目标】
请围绕「{kp_title}」设计一道全新的 408 考点变式题，通过参数改变、条件反向推导、情境置换或边界陷阱升级，检验考生是否真正吃透该知识点。

【图表与结构规范】
若涉及链表指针、顺序表、栈队列、树、图等结构：
- 严禁使用任何图片占位符；
- 使用 Markdown 表格、ASCII 字符图、Mermaid 或 KaTeX 公式清晰表达；
- 指针、下标、边界值必须写清楚，保证题目唯一可解。

【输出题型要求】：
题型：{type_desc}

请严格按以下 JSON 格式输出，不要有额外废话：
```json
{{
  "variant_type": "{variant_type_val}",
  "source_exam_point": "{chapter_val} · {kp_title}",
  "reference_true_exam": "408真题风格 · {kp_title}变式",
  "subject_code": "{sub_code}",
  "subject_name": "{subject_name}",
  "difficulty": 4,
  "score": {score_val},
  "stem": "围绕「{kp_title}」的全新变式题干（完整自洽，公式用标准 LaTeX，结构用 Markdown 或 Mermaid）...",
  {options_or_subs_example}
  "answer": "{ans_hint}",
  "explanation": "分步详细解析与推导过程（包含公式计算、核心逻辑论证与防踩坑指南）",
  "design_rationale": "说明本变式如何围绕「{kp_title}」改变参数/条件，考查哪项深层理解",
  "trap_analysis": "剖析该知识点最常见的陷阱与混淆概念"
}}
```
"""
                else:
                    prompt = f"""你是一名全国硕士研究生招生考试计算机专业基础综合（408统考）命题专家。
考生正在攻坚以下这道历年 408 统考真题：
---------------------------------------------
【原真题定位】：{orig_year_num} · 科目：{subject_name} ({sub_code}) · 考点章节：{chapter_val}
【原真题干】：
{orig_stem_clean}

【原题选项】：
{orig_options_text if orig_options_text else '（该题为综合应用大题）'}

【原题官方答案】：{orig_answer_text}
【原题官方解析要点】：{orig_exp_text[:400]}
---------------------------------------------

【任务目标】：
请为考生量身设计一道**全新高仿真 408 考点变式练习题**，考查与原真题同一核心知识点，但通过参数改变、条件反向推导、情境置换或边界陷阱升级，检验考生是否真正吃透该考点本质！

【极其重要的图表与系统结构重建规范】：
若原真题涉及电路图、数据通路、二叉树/B树、状态转换图、流水线时空图、协议报文、Cache或分页映射等图形：
变式题题干中**严禁使用任何图片占位符**，必须采用以下规范替代并精准呈现：
1. 规范的 Markdown 表格、参数说明清单；
2. 清晰的 ASCII 字符图，或包含在 ```mermaid 块中的流程图/状态图；
3. 规范的 KaTeX 数学公式（如 $$\\text{{Cache组号}} = \\dots$$）；
4. 对系统时延、位宽、网段划分、指针指向等参数给出完整、自洽、严格无歧义的文字与数值设定。

【输出题型要求】：
题型：{type_desc}

请严格按以下 JSON 格式输出，不要有额外废话：
```json
{{
  "variant_type": "{variant_type_val}",
  "source_exam_point": "{chapter_val}",
  "reference_true_exam": "{orig_year_num}变式",
  "subject_code": "{sub_code}",
  "subject_name": "{subject_name}",
  "difficulty": 4,
  "score": {score_val},
  "stem": "全新的变式题干（完整自洽，公式用标准 LaTeX，结构用 Markdown 或 Mermaid）...",
  {options_or_subs_example}
  "answer": "{ans_hint}",
  "explanation": "分步详细解析与推导过程（包含公式计算、核心逻辑论证与防踩坑指南）",
  "design_rationale": "说明本次变式题与原题相比修改了什么（参数反转/逆向求解/结构变形），考查考生的哪项深层理解",
  "trap_analysis": "剖析 408 考生在此类题目中最容易误入的陷阱与混淆概念"
}}
```
"""
                messages = [
                    {"role": "system", "content": "你是一名精通全国计算机考研 408 统考规律的命题专家，严格生成自洽、高仿真、带有 LaTeX 排版的变式练习题。只输出一个完整、可解析的 JSON，不要输出 JSON 之外的任何文字；解析控制在 500 字以内，确保 JSON 完整闭合。"},
                    {"role": "user", "content": prompt}
                ]
                raw = await LLMClient.chat_completion(messages, temperature=0.6, max_tokens=4096)
                parsed = cls._parse_variant_payload(raw)
                if not cls._is_valid_variant_payload(parsed, is_choice):
                    # 大模型偶尔会输出被截断的 JSON，补一次更短、更严格的输出请求
                    retry_messages = messages + [
                        {
                            "role": "user",
                            "content": "上一次输出被截断或不是合法 JSON。请重新输出一个完整可解析的 JSON，不要输出 JSON 之外的任何文字；题干与解析控制篇幅，确保 JSON 完整闭合。",
                        }
                    ]
                    raw = await LLMClient.chat_completion(
                        retry_messages, temperature=0.4, max_tokens=4096
                    )
                    parsed = cls._parse_variant_payload(raw)

                if cls._is_valid_variant_payload(parsed, is_choice):
                    if is_kp_mode and not cls._kp_output_is_on_topic(
                        " ".join([
                            str(parsed.get("stem", "")),
                            " ".join(str(opt.get("text", "")) for opt in (parsed.get("options") or [])),
                        ]),
                        kp_title,
                        chapter_val,
                    ):
                        print("[!] 知识点变式跑题，将使用同章节真题兜底")
                    else:
                        parsed["is_real_ai"] = True
                        parsed["base_question_id"] = base_question_id
                        parsed["original_exam_info"] = {
                            "id": reference_row[0] if (is_kp_mode and reference_row) else base_question_id,
                            "year": reference_row[1] if (is_kp_mode and reference_row) else year,
                            "question_number": reference_row[2] if (is_kp_mode and reference_row) else question_number,
                            "subject_code": sub_code,
                            "chapter_name": chapter_val if is_kp_mode else chapter_name,
                            "stem": reference_stem if (is_kp_mode and reference_stem) else orig_stem_clean,
                            "answer": reference_answer if (is_kp_mode and reference_stem) else orig_answer_text,
                            "explanation": reference_exp if (is_kp_mode and reference_stem) else orig_exp_text,
                            "options": base_options
                        }
                        return parsed
            except Exception as e:
                print(f"[!] 变式题 LLM 生成异常: {e}，将采用智能规则引擎")

        # 3. 兜底：绝不返回与知识点/原题无关的题
        if is_kp_mode:
            fallback = cls._local_generate_kp_variant(
                sub_code, kp_title, chapter_val, reference_row
            )
        elif orig_stem_clean:
            # AI 暂时不可用时，返回同题巩固，而不是随机编一道跨章节题
            fallback = cls._local_generate_original_fallback(
                sub_code, orig_year_num, orig_stem_clean, base_options,
                orig_answer_text, orig_exp_text, is_choice
            )
        else:
            raise RuntimeError("AI 变式生成暂时不可用，请稍后重试")
        fallback["base_question_id"] = base_question_id
        fallback["original_exam_info"] = {
            "id": reference_row[0] if (is_kp_mode and reference_row) else base_question_id,
            "year": reference_row[1] if (is_kp_mode and reference_row) else year,
            "question_number": reference_row[2] if (is_kp_mode and reference_row) else question_number,
            "subject_code": sub_code,
            "chapter_name": chapter_val if is_kp_mode else chapter_name,
            "stem": (reference_row[7] if (is_kp_mode and reference_row) else orig_stem_clean) or orig_stem_clean,
            "answer": (reference_row[9] if (is_kp_mode and reference_row) else orig_answer_text) or "",
            "explanation": (reference_row[10] if (is_kp_mode and reference_row) else orig_exp_text) or "",
            "options": base_options
        }
        return fallback

    @staticmethod
    def _is_valid_variant_payload(parsed: Optional[Dict[str, Any]], is_choice: bool) -> bool:
        if not isinstance(parsed, dict):
            return False
        if not str(parsed.get("stem") or "").strip():
            return False
        if is_choice:
            options = parsed.get("options")
            if not isinstance(options, list) or len(options) < 2:
                return False
        return True

    @staticmethod
    def _parse_variant_payload(raw: Optional[str]) -> Optional[Dict[str, Any]]:
        """解析大模型返回的 JSON；失败时返回 None，由调用方决定重试或兜底。"""
        if not raw:
            return None
        text = raw.strip()
        try:
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            parsed = LLMClient.safe_json_loads(text)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    @classmethod
    def _resolve_kp_chapter(cls, cur, subject_code: str, kp_title: str) -> str:
        """根据知识点标题定位所属章节，优先用章节编号，其次用章节名匹配。"""
        cur.execute(
            "SELECT DISTINCT chapter_name FROM exam_question WHERE UPPER(subject_code) = %s",
            (subject_code,),
        )
        chapters = [row[0] for row in cur.fetchall() if row and row[0]]
        title = (kp_title or "").strip()

        # 1. “2.2 线性表的应用” → 第2章
        m = re.match(r"^\s*(\d+)\s*[\.\-、]\s*", title)
        if m:
            chapter_no = m.group(1)
            for ch in chapters:
                if re.match(rf"^第\s*{chapter_no}\s*章", ch):
                    return ch

        # 2. 章节名直接出现在知识点标题中：“第2章 线性表” ↔ “线性表的应用”
        best = ""
        best_len = 0
        for ch in chapters:
            norm = cls._clean_chapter_name(ch)
            if not norm:
                continue
            if norm in title or title in norm:
                if len(norm) > best_len:
                    best = ch
                    best_len = len(norm)
        return best

    @staticmethod
    def _clean_chapter_name(chapter: str) -> str:
        text = re.sub(r"^第\s*\d+\s*章\s*", "", chapter or "")
        text = re.sub(r"[（(].*?[)）]", "", text)
        return text.strip()

    @classmethod
    def _kp_keywords(cls, kp_title: str, chapter: str) -> set:
        """提取知识点/章节的核心词，用于判断题目是否围绕该知识点。"""
        candidates = set()

        norm_chapter = cls._clean_chapter_name(chapter)
        if norm_chapter:
            candidates.add(norm_chapter)

        title = re.sub(r"^\s*\d+(\.\d+)*\s*", "", kp_title or "").strip()
        if title:
            candidates.add(title)
            # “线性表的应用” → “线性表”；“多核与多处理机” → “多核”“多处理机”
            for part in re.split(r"[的与和、，,\s]+", title):
                if len(part) >= 2:
                    candidates.add(part)

        # 长标题补充前缀/后缀词，如“文件系统实现” → “文件系统”
        for source in (title, norm_chapter):
            if not source:
                continue
            for size in (2, 3, 4):
                if len(source) > size:
                    candidates.add(source[:size])
                    candidates.add(source[-size:])

        # 常见章节的同义核心词，避免“链表题没出现线性表三个字”被误杀
        synonyms = {
            "线性表": ["顺序表", "链表", "单链表", "双链表", "循环链表", "静态链表", "有序表", "头结点", "前驱", "后继"],
            "栈、队列和数组": ["栈", "队列", "循环队列", "数组", "栈顶", "队头", "队尾", "出栈", "入栈", "卡特兰"],
            "树与二叉树": ["二叉树", "叶子", "哈夫曼", "WPL", "遍历", "二叉搜索树", "平衡", "森林", "孩子", "兄弟"],
            "图": ["顶点", "邻接", "拓扑", "最短路径", "关键路径", "连通", "生成树", "Dijkstra", "Floyd", "AOV", "AOE"],
            "查找": ["折半", "散列", "哈希", "B树", "B+树", "平均查找长度", "ASL", "冲突"],
            "排序": ["插入排序", "希尔", "冒泡", "快速排序", "选择排序", "堆排序", "归并", "基数", "稳定性"],
            "串": ["字符串", "模式匹配", "KMP", "next", "子串"],
        }
        for key, words in synonyms.items():
            if norm_chapter and (key in norm_chapter or norm_chapter in key):
                candidates.update(words)

        return {c for c in candidates if c}

    @classmethod
    def _kp_output_is_on_topic(cls, text: str, kp_title: str, chapter: str) -> bool:
        """粗校验生成题是否仍围绕知识点，拦截明显的跨章节跑题。"""
        if not text:
            return False
        keywords = cls._kp_keywords(kp_title, chapter)
        return any(k in text for k in keywords)

    @classmethod
    def _local_generate_kp_variant(
        cls,
        subject: str,
        kp_title: str,
        chapter: str,
        reference_row,
    ) -> Dict[str, Any]:
        """知识点模式的本地兜底：只使用同章节真题，避免跑题。"""
        subject_name = SUBJECT_MAP.get(subject, "408专业课")
        if reference_row and (reference_row[7] or "").strip():
            stem = (reference_row[7] or "").strip()
            options = []
            if reference_row[8]:
                try:
                    options = json.loads(reference_row[8]) or []
                except Exception:
                    options = []
            answer = (reference_row[9] or "").strip()
            explanation = (reference_row[10] or "").strip() or "请结合教材复习该知识点的定义、性质与典型操作。"
            result = {
                "is_real_ai": False,
                "variant_type": "SINGLE_CHOICE" if options else "COMPREHENSIVE",
                "source_exam_point": f"{chapter} · {kp_title}",
                "reference_true_exam": "408 同章节真题（AI 繁忙时的知识点巩固题）",
                "subject_code": subject,
                "subject_name": subject_name,
                "difficulty": 3,
                "score": 2 if options else 10,
                "stem": stem,
                "answer": answer or "见解析",
                "explanation": explanation,
                "design_rationale": f"AI 变式服务暂时不可用，先提供一道同章节真题巩固「{kp_title}」，不会跳转到其他章节。",
                "trap_analysis": f"复习「{kp_title}」时注意概念边界、操作前提与复杂度。",
            }
            if options:
                result["options"] = options
            return result

        raise RuntimeError(f"未能为知识点「{kp_title}」定位同章节参考题，请稍后重试")

    @classmethod
    def _local_generate_original_fallback(
        cls,
        subject: str,
        ref_exam: str,
        stem: str,
        options: Optional[List[Dict[str, Any]]],
        answer: str,
        explanation: str,
        is_choice: bool,
    ) -> Dict[str, Any]:
        """AI 不可用时返回原题巩固，保证不跑题。"""
        result = {
            "is_real_ai": False,
            "variant_type": "SINGLE_CHOICE" if (is_choice and options) else "COMPREHENSIVE",
            "source_exam_point": f"{ref_exam} 原题巩固",
            "reference_true_exam": ref_exam,
            "subject_code": subject,
            "subject_name": SUBJECT_MAP.get(subject, "408专业课"),
            "difficulty": 4,
            "score": 2 if (is_choice and options) else 10,
            "stem": stem,
            "answer": answer or "见解析",
            "explanation": explanation or "请结合原题解析复习对应考点。",
            "design_rationale": "AI 变式服务暂时不可用，先返回原题巩固，避免生成跑题内容。",
            "trap_analysis": "先吃透原题的考点归属、边界条件与解题路径，再尝试变式训练。",
        }
        if is_choice and options:
            result["options"] = options
        return result

    @classmethod
    def save_wrong_question(cls, data: Dict[str, Any]) -> bool:
        """保存做错的变式题或练习题到错题本数据库"""
        try:
            conn = cls._get_db()
            cur = conn.cursor()
            user_id = data.get("user_id", 1)
            question_id = data.get("question_id") or f"variant-{int(random.random()*1000000)}"
            subject_code = (data.get("subject_code") or "ds").lower()
            if subject_code == "cn" or subject_code == "net":
                subject_code = "cn"
            custom_json = data.get("custom_question_json")
            if isinstance(custom_json, dict):
                custom_json = json.dumps(custom_json, ensure_ascii=False)
            source_type = data.get("source_type", "VARIANT")
            error_reason_tag = data.get("error_reason_tag", "CONCEPT_CONFUSION")
            user_notes = data.get("user_notes", "真题变式练习错题自动收录")
            last_wrong_answer = data.get("last_wrong_answer", "")

            # 检查是否已存在
            cur.execute("SELECT id, wrong_count FROM user_wrong_question WHERE user_id = %s AND question_id = %s", (user_id, question_id))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE user_wrong_question 
                    SET wrong_count = wrong_count + 1,
                        last_wrong_answer = %s,
                        last_practiced_at = NOW(),
                        master_status = 'UNMASTERED'
                    WHERE id = %s
                """, (last_wrong_answer, row[0]))
            else:
                cur.execute("""
                    INSERT INTO user_wrong_question 
                    (user_id, question_id, custom_question_json, subject_code, source_type, wrong_count, master_status, error_reason_tag, user_notes, last_wrong_answer, last_practiced_at)
                    VALUES (%s, %s, %s, %s, %s, 1, 'UNMASTERED', %s, %s, %s, NOW())
                """, (user_id, question_id, custom_json, subject_code, source_type, error_reason_tag, user_notes, last_wrong_answer))

            cur.close()
            conn.close()
            return True
        except Exception as e:
            print(f"[!] 保存错题异常: {e}")
            return False
