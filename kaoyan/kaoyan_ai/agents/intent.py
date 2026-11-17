from __future__ import annotations

from kaoyan_ai.schemas import AgentRequest, Intent


class IntentAgent:
    """在接入模型路由前使用的规则意图分类器。

    第一版使用关键词分类，优点是透明、稳定；后续可以替换成大模型路由链，
    同时保留现有 Intent 枚举和下游接口。
    """

    KEYWORDS: list[tuple[Intent, tuple[str, ...]]] = [
        (Intent.ADMISSION_PREDICTION, ("院校", "学校", "专业", "分数线", "录取", "复试", "预测")),
        (Intent.STUDY_PLAN, ("学习计划", "复习计划", "规划", "剩余时间", "日计划", "周计划", "月计划")),
        (Intent.PERSONAL_ANALYSIS, ("学习分析", "学习报告", "个人分析", "薄弱点", "薄弱科目", "错题分析", "掌握度", "错误原因", "画像")),
        (Intent.DAILY_PUSH, ("每日", "推送", "今天学", "打卡")),
        (Intent.SIMILAR_TRAINING, ("相似题", "同类题", "训练", "再出", "练习")),
        (Intent.RECITATION, ("带背", "背诵", "记忆", "知识点", "口诀")),
        (Intent.SOLVE_QUESTION, ("解题", "答案", "怎么做", "题目", "解析", "图片", "考点精髓", "常见陷阱", "精讲", "讲解", "大白话", "原理", "概念")),
    ]

    CONCEPT_TERMS = (
        "考点精髓", "常见陷阱", "精讲", "讲解", "原理", "概念", "详细分析",
        "梳理", "区别", "比较", "推导", "定义", "作用", "特点", "复杂度",
        "是什么", "怎么理解", "如何理解", "知识点", "考点", "易错",
    )
    QUESTION_TERMS = (
        "这道题", "该题", "题目的", "题目是", "选项", "答案", "怎么算",
        "计算", "求解", "求什么", "求值", "下列", "已知", "如图", "图片",
        "截图", "第几题", "怎么选", "选什么",
    )
    RECITATION_TERMS = ("带背", "背诵", "记忆", "口诀", "默写")

    @classmethod
    def _is_concept_request(cls, message: str) -> bool:
        text = str(message or "").lower()
        if not text.strip():
            return False
        if any(term in text for term in cls.QUESTION_TERMS):
            return False
        return any(term in text for term in cls.CONCEPT_TERMS)

    def classify(self, request: AgentRequest) -> Intent:
        """判断应该由哪个子智能体处理当前用户请求。"""

        if request.intent_hint:
            return request.intent_hint
        if request.image_base64:
            return Intent.SOLVE_QUESTION
        message = request.message.lower()
        if any(term in message for term in self.RECITATION_TERMS):
            return Intent.RECITATION
        if self._is_concept_request(message):
            return Intent.EXPLAIN_CONCEPT
        for intent, keywords in self.KEYWORDS:
            if any(keyword.lower() in message for keyword in keywords):
                return intent
        return Intent.SOLVE_QUESTION

    def classify_many(self, request: AgentRequest) -> list[Intent]:
        """Return every requested capability in message order.

        The legacy ``classify`` method remains stable for existing API callers,
        while the Agent runtime can decompose compound goals.
        """

        if request.intent_hint:
            return [request.intent_hint]
        if request.image_base64:
            return [Intent.SOLVE_QUESTION]
        message = request.message.lower()
        if any(term in message for term in self.RECITATION_TERMS):
            return [Intent.RECITATION]
        if self._is_concept_request(message):
            intents = [Intent.EXPLAIN_CONCEPT]
            if any(term in message for term in ("出题", "练习", "训练", "做题")):
                intents.append(Intent.SIMILAR_TRAINING)
            return intents
        matches: list[tuple[int, Intent]] = []
        for intent, keywords in self.KEYWORDS:
            positions = [
                message.find(keyword.lower())
                for keyword in keywords
                if keyword.lower() in message
            ]
            if positions:
                matches.append((min(positions), intent))
        matches.sort(key=lambda item: item[0])
        intents = list(dict.fromkeys(intent for _, intent in matches))
        return intents or [Intent.SOLVE_QUESTION]
