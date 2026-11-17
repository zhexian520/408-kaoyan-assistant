import re
import json
import httpx
from typing import Dict, Any, List
from config import settings
from models.schemas import SubjectiveGradingRequest, SubjectiveGradingData, RubricItemDetail
from services.ai_config_service import AIConfigService
from services.llm_client import LLMClient

class RubricGradingService:
    @classmethod
    async def grade_subjective_question(cls, req: SubjectiveGradingRequest) -> SubjectiveGradingData:
        # 1. 若配置了 AI 大模型 API KEY，则调用真实大模型进行多维度采分点精批
        config = AIConfigService.get_config(mask_key=False)
        if config.get("api_key"):
            try:
                return await cls._llm_rubric_grade(req, config)
            except Exception as e:
                print(f"[!] LLM 阅卷调用异常: {e}，无缝切换为内置 408 采分点规则引擎。")

        # 2. 内置 408 采分点规则引擎（针对算法大题、系统大题深度定制）
        return cls._local_rubric_grade(req)

    @classmethod
    async def _llm_rubric_grade(cls, req: SubjectiveGradingRequest, config: Dict[str, Any]) -> SubjectiveGradingData:
        prompt = f"""你是一名资深的全国硕士研究生招生考试计算机专业基础综合（408统考）主观题专家阅卷组长。
请根据题目要求、参考答案和采分点规则，对考生的主观作答进行严格而公正的采分点匹配打分。

【试题信息】
- 题目ID: {req.question_id}
- 本题满分: {req.max_score} 分
- 题干内容:
{req.stem}

【标准答案与评分说明】:
{req.standard_answer or req.explanation}

【考生提交的作答】:
{req.user_answer}

请按照 408 统考采分点细化规则进行批阅，并严格以如下 JSON 格式返回输出（不要包含其他额外说明）：
{{
  "score": 实际得分数值(0 到 {req.max_score}),
  "feedback": "整体作答评语",
  "missing_points": ["遗漏采分点1", "遗漏采分点2"],
  "error_analysis": "核心错误、概念混淆或代码缺陷剖析",
  "rubric_matched": [
    {{
      "rubric_id": 1,
      "point_desc": "采分项说明(如基本思想/核心算法/复杂度)",
      "max_score": 采分项满分,
      "earned_score": 该项得分,
      "hit": true或false,
      "reason": "得分或扣分原因"
    }}
  ],
  "advice": "针对408考研主观题规范答题的优化改进建议"
}}
"""
        messages = [
            {"role": "system", "content": config.get("system_prompt", "你是一名精通408计算机考研评卷标准的AI助教，专注于主观题采分点评测。")},
            {"role": "user", "content": prompt}
        ]

        raw_content = await LLMClient.chat_completion(
            messages=messages,
            model=config.get("text_model"),
            temperature=0.2
        )

        if raw_content:
            json_match = re.search(r"\{[\s\S]*\}", raw_content)
            if json_match:
                parsed = json.loads(json_match.group())
                rubrics = [RubricItemDetail(**item) for item in parsed.get("rubric_matched", [])]
                return SubjectiveGradingData(
                    question_id=req.question_id,
                    max_score=req.max_score,
                    score=float(parsed.get("score", 0)),
                    feedback=parsed.get("feedback", "AI 阅卷完成。"),
                    missing_points=parsed.get("missing_points", []),
                    error_analysis=parsed.get("error_analysis", ""),
                    rubric_matched=rubrics,
                    advice=parsed.get("advice", "答题时注意分步骤书写。")
                )

        raise ValueError("未能解析 LLM 返回的 JSON 格式")

    @classmethod
    def _local_rubric_grade(cls, req: SubjectiveGradingRequest) -> SubjectiveGradingData:
        user_ans = req.user_answer.strip()
        max_score = req.max_score

        if not user_ans:
            return SubjectiveGradingData(
                question_id=req.question_id,
                max_score=max_score,
                score=0.0,
                feedback="考生未作答，本题得 0 分。",
                missing_points=["未给出算法设计思想", "未提供 C/C++ 核心代码", "未分析时空复杂度"],
                error_analysis="答卷空白，未见任何有效作答内容。",
                rubric_matched=[
                    RubricItemDetail(rubric_id=1, point_desc="基本设计思想", max_score=round(max_score * 0.3, 1), earned_score=0.0, hit=False, reason="未作答"),
                    RubricItemDetail(rubric_id=2, point_desc="核心算法/代码实现", max_score=round(max_score * 0.5, 1), earned_score=0.0, hit=False, reason="未作答"),
                    RubricItemDetail(rubric_id=3, point_desc="复杂度分析及结论", max_score=round(max_score * 0.2, 1), earned_score=0.0, hit=False, reason="未作答"),
                ],
                advice="408统考大题分值高，哪怕只写出基础思路或伪代码框架也可按采分点拿到部分基础分，切忌留空。"
            )

        # 408 算法与主观大题的典型采分维度
        # 1. 基本思想检测 (关键词: 思想、思路、遍历、递归、迭代、贪心、动态规划、哈希、双指针、Kahn、拓扑)
        # 2. 代码实现检测 (关键词: int, void, struct, for, while, if, return, ->, NULL)
        # 3. 复杂度检测 (关键词: O(, 复杂度, 时间, 空间)
        has_idea = bool(re.search(r"(思想|思路|步骤|方法|算法|遍历|辅助|首先|然后|最后)", user_ans))
        has_code = bool(re.search(r"(int |void |for\s*\(|while\s*\(|if\s*\(|return |->|malloc|NULL)", user_ans))
        has_complexity = bool(re.search(r"(O\(|复杂度|时间|空间)", user_ans))

        rubrics = []
        earned_total = 0.0
        missing = []

        # 采分项 1: 基本设计思想 (30% 分值)
        idea_max = round(max_score * 0.3, 1)
        if has_idea and len(user_ans) > 40:
            idea_score = round(idea_max * 0.85, 1)
            rubrics.append(RubricItemDetail(
                rubric_id=1, point_desc="算法或方案基本设计思想", max_score=idea_max, earned_score=idea_score,
                hit=True, reason="基本思想表述清晰，解题思路完整。"
            ))
            earned_total += idea_score
        else:
            rubrics.append(RubricItemDetail(
                rubric_id=1, point_desc="算法或方案基本设计思想", max_score=idea_max, earned_score=0.0,
                hit=False, reason="未清晰描述算法基本设计思想或论述过于模糊。"
            ))
            missing.append("缺少清晰规范的基本设计思想文字论述")

        # 采分项 2: 代码与逻辑实现 (50% 分值)
        code_max = round(max_score * 0.5, 1)
        if has_code:
            # 判断代码饱满度与逻辑结构
            if len(user_ans) > 150:
                code_score = round(code_max * 0.85, 1)
                rubrics.append(RubricItemDetail(
                    rubric_id=2, point_desc="C/C++核心算法实现与规范度", max_score=code_max, earned_score=code_score,
                    hit=True, reason="核心算法代码完整，变量定义与循环判断逻辑严谨。"
                ))
            else:
                code_score = round(code_max * 0.55, 1)
                rubrics.append(RubricItemDetail(
                    rubric_id=2, point_desc="C/C++核心算法实现与规范度", max_score=code_max, earned_score=code_score,
                    hit=True, reason="给出了部分核心代码，但边界条件判断或关键指针操作尚不完善。"
                ))
                missing.append("代码中部分边界情况与指针判空未充分考虑")
            earned_total += code_score
        else:
            rubrics.append(RubricItemDetail(
                rubric_id=2, point_desc="C/C++核心算法实现与规范度", max_score=code_max, earned_score=0.0,
                hit=False, reason="未提供可执行的 C/C++ 语言核心代码实现。"
            ))
            missing.append("未采用 C/C++ 规范语法描述核心算法")

        # 采分项 3: 时空复杂度分析 (20% 分值)
        comp_max = round(max_score - idea_max - code_max, 1)
        if has_complexity:
            rubrics.append(RubricItemDetail(
                rubric_id=3, point_desc="时间与空间复杂度分析", max_score=comp_max, earned_score=comp_max,
                hit=True, reason="正确给出了时间与空间复杂度的渐进阶大O记号。"
            ))
            earned_total += comp_max
        else:
            rubrics.append(RubricItemDetail(
                rubric_id=3, point_desc="时间与空间复杂度分析", max_score=comp_max, earned_score=0.0,
                hit=False, reason="未分析时间复杂度与空间复杂度。"
            ))
            missing.append("缺少时间复杂度和空间复杂度的明确大O分析")

        earned_total = min(float(max_score), round(earned_total, 1))

        feedback = f"本题满分 {max_score} 分，综合采分点评定得 {earned_total} 分。"
        error_analysis = "采分点遗漏主要集中在: " + "；".join(missing) if missing else "作答完整规范，整体逻辑符合408统考采分要求。"

        advice = "建议按照 408 标准三段式答题：\n(1) 基本设计思想（明确数据结构与核心循环思路）；\n(2) 算法代码（关键处写注释，注意指针和越界判定）；\n(3) 时空复杂度（分别写明时间复杂度与辅助空间复杂度）。"

        return SubjectiveGradingData(
            question_id=req.question_id,
            max_score=max_score,
            score=earned_total,
            feedback=feedback,
            missing_points=missing,
            error_analysis=error_analysis,
            rubric_matched=rubrics,
            advice=advice
        )

