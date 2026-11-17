"""
个性化备考规划与 AI 每日提分清单智能生成服务
"""

import json
import re
from typing import Dict, Any, List, Optional
from services.llm_client import LLMClient

CATEGORY_MAP = {
    "COURSE": "📖 核心考点突破",
    "EXAM": "🎯 408真题演练",
    "VARIANT": "⚡ 靶向变式强化",
    "WRONG": "📝 错题医生复盘",
    "MOCK": "🏆 阶段全真模考",
    "AGENT": "🤖 助教考点深剖"
}

ACTION_TEXT_MAP = {
    "COURSE": "去研读考点",
    "EXAM": "去刷真题",
    "VARIANT": "做变式题",
    "WRONG": "复盘错题",
    "MOCK": "进入模考",
    "AGENT": "咨询助教"
}

SUBJECT_NAMES = {
    "DS": "数据结构",
    "CO": "计算机组成原理",
    "OS": "操作系统",
    "NET": "计算机网络",
    "ALL": "408全科综合"
}

class StudyPlanService:

    @classmethod
    async def generate_daily_checklist(
        cls,
        user_id: int,
        target_school: str = "清华大学",
        target_score: int = 125,
        exam_year: int = 2026,
        days_until_exam: int = 42,
        total_tests: int = 0,
        avg_score: float = 0.0,
        wrong_count: int = 0,
        weak_points: Optional[List[str]] = None,
        subject_mastery: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        根据学员目标院校、考研年份、系统学习进度及错题薄弱点，由 DeepSeek AI 智能体生成今日贴切系统的每日清单
        """
        weak_points = weak_points or [
            "Cache-主存组相联映射及缺失率分析",
            "请求分页存储管理及TLB快表地址变换",
            "二叉树遍历与带权路径长度 (WPL) 求解"
        ]

        mastery_summary = ""
        if subject_mastery:
            items = []
            for m in subject_mastery:
                code = m.get("subjectCode", "")
                name = m.get("subjectName", code)
                rate = m.get("correctRate", 0)
                level = m.get("masteryLevel", "一般")
                practiced = m.get("practicedCount", 0)
                items.append(f"{name}(已练{practiced}题, 正确率{rate}%, 评估:{level})")
            mastery_summary = "；".join(items)
        else:
            mastery_summary = "数据结构(已练12题, 65.0%, 良好)；计算机组成原理(已练10题, 58.0%, 待巩固)；操作系统(已练15题, 62.0%, 良好)；计算机网络(已练8题, 55.0%, 待巩固)"

        # 构造给 DeepSeek 的深度提示词
        prompt = f"""你是一位拥有10年408计算机统考顶尖辅导经验的资深名师。
请根据以下学员的个人目标与当前在系统内的真实学习数据，为他量身定制一份【今日专属提分学习清单】。

【学员档案与目标】：
- 目标高校：{target_school}（408 目标分：{target_score} 分）
- 考研年份：{exam_year} 年（距离全国统考还有 {days_until_exam} 天）
- 系统做题情况：已做模拟考试 {total_tests} 套，平均分 {avg_score} 分，错题本待消灭未掌握题目 {wrong_count} 道。
- 学科掌握能力：{mastery_summary}
- 历史错题最高频薄弱考点：{json.dumps(weak_points, ensure_ascii=False)}

【生成核心原则（必须严格贴合本考研系统已有功能，确保让学员可直接落地使用）】：
1. 给出 1 段个性化考情诊断建议（围绕该考生报考【{target_school}】的分数门槛、当前剩余天数阶段以及计组/操作系统等薄弱环节，给出切中要害、有紧迫感且富含方法的指导）。
2. 生成 4~5 个今日必做任务，必须与本系统功能无缝闭环：
   - 课程中心研读章节：action_url 必须形如 /user/courses?subject=CO&section=3.3 或 /user/courses?subject=DS&section=2.2
   - 408 全真试题专区刷题：action_url 必须形如 /user/exams?subject=CO&mode=practice 或 /user/exams?subject=DS&mode=practice
   - 薄弱点变式练习：action_url 为 /user/variant
   - 错题医生深度复盘：action_url 为 /user/wrong-notebook
   - 阶段模考或智能体问答：action_url 为 /user/exam-hall 或 /user/agent
3. 必须输出纯合法 JSON 格式，严格遵循以下结构（不要包含 markdown 代码块包裹以外的多余文字）：
{{
  "diagnosis": "个性化考情诊断与战略建议（100-200字，结合报考院校、分数线要求与今日攻克重点）",
  "focus_subject": "CO",
  "daily_quote": "今日励志备考格言",
  "tasks": [
    {{
      "id": "task_1",
      "category": "COURSE",
      "subject": "CO",
      "title": "【考点突破】研读《2026计算机组成原理》3.3 Cache 高速缓存核心考点与硬件映射机制",
      "guidance": "清华大学对体系结构底层硬件考查深入，重点掌握组相联映射Tag比较器数量与主存地址字段划分。",
      "action_url": "/user/courses?subject=CO&section=3.3",
      "action_text": "前往研读考点",
      "estimated_minutes": 25,
      "priority": "HIGH"
    }},
    {{
      "id": "task_2",
      "category": "EXAM",
      "subject": "CO",
      "title": "【真题精练】在 408 试题专区以练习模式完成 3 道 Cache 映射高频统考真题",
      "guidance": "限时作答，系统将自动记录答题用时与得分，错题自动进入错题本。",
      "action_url": "/user/exams?subject=CO&mode=practice",
      "action_text": "去刷真题",
      "estimated_minutes": 30,
      "priority": "HIGH"
    }},
    {{
      "id": "task_3",
      "category": "VARIANT",
      "subject": "CO",
      "title": "【AI变式】针对 Cache 组相联映射错题，完成 1 道 DeepSeek 实时变式题",
      "guidance": "检验是否真正掌握了地址划分算法，而非死记原题答案。",
      "action_url": "/user/variant",
      "action_text": "做变式题",
      "estimated_minutes": 20,
      "priority": "MEDIUM"
    }},
    {{
      "id": "task_4",
      "category": "WRONG",
      "subject": "OS",
      "title": "【错题复盘】错题医生深度复盘：请求分页多级页表与 TLB 虚存地址转换",
      "guidance": "查看 AI 给出的考点采分定位与错因归因，独立重做直到完全搞懂。",
      "action_url": "/user/wrong-notebook",
      "action_text": "复盘错题",
      "estimated_minutes": 20,
      "priority": "MEDIUM"
    }}
  ]
}}
"""
        # 调用大模型生成
        try:
            raw_res = await LLMClient.chat_completion(
                [{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1500
            )
            if raw_res:
                parsed = LLMClient.safe_json_loads(raw_res)
                if isinstance(parsed, dict) and "tasks" in parsed and len(parsed["tasks"]) > 0:
                    return cls._format_checklist_result(parsed, target_school, target_score, exam_year, days_until_exam)
        except Exception as e:
            print(f"[StudyPlanService] AI generation exception: {e}, using expert rule fallback.")

        # 兜底确定性名师规则引擎
        return cls._build_rule_based_checklist(
            target_school=target_school,
            target_score=target_score,
            exam_year=exam_year,
            days_until_exam=days_until_exam,
            weak_points=weak_points,
            subject_mastery=subject_mastery
        )

    @classmethod
    def _format_checklist_result(
        cls,
        ai_data: Dict[str, Any],
        target_school: str,
        target_score: int,
        exam_year: int,
        days_until_exam: int
    ) -> Dict[str, Any]:
        tasks = ai_data.get("tasks", [])
        formatted_tasks = []
        total_minutes = 0

        for idx, t in enumerate(tasks):
            cat = t.get("category", "COURSE").upper()
            sub = t.get("subject", "CO").upper()
            est = int(t.get("estimated_minutes", 25))
            total_minutes += est

            formatted_tasks.append({
                "id": t.get("id", f"task_{idx + 1}"),
                "category": cat,
                "category_name": CATEGORY_MAP.get(cat, "📖 核心考点突破"),
                "subject": sub,
                "subject_name": SUBJECT_NAMES.get(sub, "组成原理"),
                "title": t.get("title", f"【今日任务 {idx + 1}】核心考点攻坚"),
                "guidance": t.get("guidance", t.get("description", "紧跟考研大纲，扎实攻克该高频采分点。")),
                "action_url": t.get("action_url", t.get("url", "/user/courses")),
                "action_text": t.get("action_text", ACTION_TEXT_MAP.get(cat, "立即前往")),
                "estimated_minutes": est,
                "priority": t.get("priority", "HIGH" if idx < 2 else "MEDIUM"),
                "is_completed": False
            })

        return {
            "diagnosis": ai_data.get("diagnosis", f"针对【{target_school}】高分标准（408目标{target_score}分），距离{exam_year}统考还有{days_until_exam}天。今日建议重点推进核心薄弱环节，在做题与复盘中形成提分闭环。"),
            "focus_subject": ai_data.get("focus_subject", "CO"),
            "focus_subject_name": SUBJECT_NAMES.get(ai_data.get("focus_subject", "CO"), "计算机组成原理"),
            "daily_quote": ai_data.get("daily_quote", "千里之行，始于足下；408硬核难点，尽在今日一笔一划。"),
            "estimated_total_minutes": total_minutes or 95,
            "target_school": target_school,
            "target_score": target_score,
            "exam_year": exam_year,
            "days_until_exam": days_until_exam,
            "tasks": formatted_tasks
        }

    @classmethod
    def _build_rule_based_checklist(
        cls,
        target_school: str,
        target_score: int,
        exam_year: int,
        days_until_exam: int,
        weak_points: List[str],
        subject_mastery: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """名师规则兜底生成器：确保系统离线或超时时依然生成高质量、100%贴切本系统的清单"""
        primary_weak = weak_points[0] if weak_points else "Cache-主存组相联映射及缺失率分析"
        second_weak = weak_points[1] if len(weak_points) > 1 else "请求分页存储管理及TLB快表地址变换"

        tasks = [
            {
                "id": "task_1",
                "category": "COURSE",
                "category_name": "📖 核心考点突破",
                "subject": "CO",
                "subject_name": "计算机组成原理",
                "title": "【考点突破】研读《2026计算机组成原理》3.3 Cache 高速缓存映射与缺失率分析",
                "guidance": f"针对【{target_school}】408高分标准（{target_score}分），Cache主存映射是必考硬核算力题，今日重点掌握组相联映射Tag比较器数量计算与主存地址字段划分。",
                "action_url": "/user/courses?subject=CO&section=3.3",
                "action_text": "去研读考点",
                "estimated_minutes": 25,
                "priority": "HIGH",
                "is_completed": False
            },
            {
                "id": "task_2",
                "category": "EXAM",
                "category_name": "🎯 408真题演练",
                "subject": "CO",
                "subject_name": "计算机组成原理",
                "title": "【真题精练】在 408 全真试题专区以【练习模式】完成 3 道 Cache 映射高频统考真题",
                "guidance": "练习模式将真实记录用时与答案，提交后可查看官方命题采分点，做错自动纳入错题本进行针对性归因。",
                "action_url": "/user/exams?subject=CO&mode=practice",
                "action_text": "去刷真题",
                "estimated_minutes": 30,
                "priority": "HIGH",
                "is_completed": False
            },
            {
                "id": "task_3",
                "category": "VARIANT",
                "category_name": "⚡ 靶向变式强化",
                "subject": "CO",
                "subject_name": "计算机组成原理",
                "title": f"【AI变式】针对薄弱点【{primary_weak}】，由 DeepSeek 智能体实时出题做 1 道变式练习",
                "guidance": "变式练习由 AI 依据当前题目实时衍生，脱离死记硬背原题，做错同样计入变式错题库便于后续二次攻关。",
                "action_url": "/user/variant",
                "action_text": "做变式题",
                "estimated_minutes": 20,
                "priority": "MEDIUM",
                "is_completed": False
            },
            {
                "id": "task_4",
                "category": "WRONG",
                "category_name": "📝 错题医生复盘",
                "subject": "OS",
                "subject_name": "操作系统",
                "title": f"【错题复盘】错题医生深度归因：复盘【{second_weak}】并重做消除",
                "guidance": "深入查看 DeepSeek 伴学引擎给出的错因归因与知识点漏洞分析，完成重做直到标记为已掌握。",
                "action_url": "/user/wrong-notebook",
                "action_text": "复盘错题",
                "estimated_minutes": 20,
                "priority": "MEDIUM",
                "is_completed": False
            }
        ]

        return {
            "diagnosis": f"根据您设定的【{target_school}】高分目标（408目标 {target_score} 分），距离 {exam_year} 年统考还有 {days_until_exam} 天。当前做题数据反映计组 Cache 映射与操作系统虚拟内存属于首要拉分短板。建议今日采取“先精读考点教材 -> 后真题实战演练 -> AI变式靶向检测 -> 错题复盘消灭”的系统化闭环模式，扎实攻克每一个失分隐患！",
            "focus_subject": "CO",
            "focus_subject_name": "计算机组成原理",
            "daily_quote": "志之所趋，无远弗届；穷山距海，不能限也。408 今日每前进一步，清华浙大就近一分！",
            "estimated_total_minutes": 95,
            "target_school": target_school,
            "target_score": target_score,
            "exam_year": exam_year,
            "days_until_exam": days_until_exam,
            "tasks": tasks
        }

    @classmethod
    def generate_plan(cls, prep_duration_months: int = 6, base_level: str = "MEDIUM", target_score: int = 125) -> Dict[str, Any]:
        """全阶段宏观规划生成"""
        stages = [
            {
                "stage": "BASIC",
                "stage_name": "第一阶段：四科核心基础夯实 (第1-8周)",
                "focus": "教材知识点地毯式复习，打通四大学科脉络，辅以经典章节习题",
                "weekly_hours": 24,
                "recommended_tasks": [
                    "数据结构：线性表、二叉树、图论基础遍历与存储结构代码实现",
                    "组成原理：数据表示、定点/浮点运算、Cache-主存映射机制",
                    "操作系统：进程状态转换、PV操作经典模型、分页虚存转换",
                    "计算机网络：OSI与TCP/IP体系、CIDR子网划分、滑动窗口"
                ]
            },
            {
                "stage": "ENHANCE",
                "stage_name": "第二阶段：专题大题专项强化 (第9-16周)",
                "focus": "主观综合大题高频考点突破，针对算法设计题与综合计算大题专题攻关",
                "weekly_hours": 28,
                "recommended_tasks": [
                    "数据结构算法大题：双指针、二叉树递归、图论DFS/BFS求解模板",
                    "组成原理综合大题：CPU数据通路控制信号表设计、指令流水线冒险计算",
                    "操作系统综合大题：多进程PV操作互斥同步代码编写、虚拟内存页面置换时序",
                    "计算机网络综合大题：跨网络层传输层综合数据流转分析、TCP拥塞窗口演进"
                ]
            },
            {
                "stage": "TRUE_EXAM",
                "stage_name": "第三阶段：18年真题全真全科模拟 (第17-22周)",
                "focus": "严格 180 分钟全真模考限时训练，适应考试强度与时间分配",
                "weekly_hours": 30,
                "recommended_tasks": [
                    "2009-2018 年 10 套统考真题计时实战与错题收录",
                    "2019-2023 年近 5 年真题逐题二刷与采分点剖析",
                    "梳理高频错题本，归因失分点并开展错因针对性重练"
                ]
            },
            {
                "stage": "SPRINT",
                "stage_name": "第四阶段：考前冲刺与薄弱点查漏补缺 (第23-24周)",
                "focus": "最新 2024-2026 真题押题实测，AI 智能体诊断弱项突击复盘",
                "weekly_hours": 25,
                "recommended_tasks": [
                    "2024-2026 最新统考真题终极全真模考仿真",
                    "AI 诊断高频薄弱考点清单专项消灭",
                    "背诵高频公式速查手册与算法时间空间复杂度速查表"
                ]
            }
        ]

        return {
            "plan_name": f"408 统考冲刺 {target_score} 分定制化规划",
            "prep_duration_months": prep_duration_months,
            "base_level": base_level,
            "target_score": target_score,
            "daily_target_hours": 4.5 if base_level == "MEDIUM" else 5.5,
            "stages": stages
        }
