from __future__ import annotations

from kaoyan_ai.agents.base import AgentBase
from kaoyan_ai.rag import LocalRetriever
from kaoyan_ai.schemas import AgentRequest, AgentResponse, Intent


class ConceptAgent(AgentBase):
    """面向 408 知识点的概念精讲智能体。

    与 SolutionAgent 的区别：用户没有给出具体题干时，不套用“最终答案—解题步骤”
    的做题模板，而是按“定位—概念—原理—公式/代码—例子—陷阱—考法”讲解。
    """

    def __init__(self, retriever: LocalRetriever | None = None) -> None:
        super().__init__()
        self.retriever = retriever or LocalRetriever()

    def run(self, request: AgentRequest) -> AgentResponse:
        retrieval_query = self.contextual_retrieval_query(request)
        retrieved = self.retriever.retrieve(
            retrieval_query,
            collection="knowledge_points",
            k=6,
            user_id=request.metadata.get("mysql_user_id"),
        )
        context = "\n\n".join(
            f"[{item.id}] {item.title}\n科目：{item.subject}\n内容：{item.content}"
            for item in retrieved
        )
        system_prompt = self.common_system_prompt(
            "你负责 408 计算机考研知识点精讲。当前请求是概念学习，不是提交一道待解题目；"
            "不要输出“最终答案”“题型判断”“选项分析”等解题模板。",
            task="concept",
            concept_mode=True,
        )
        user_prompt = f"""
用户想理解的内容：
{request.message}

近期对话上下文：
{self.conversation_context(request)}

长期学习偏好：
{request.metadata.get("semantic_memory") or "暂无稳定偏好记录"}

本地参考资料：
{context or "暂无本地知识点召回，请基于 408 考纲和教材通识谨慎讲解。"}

请围绕用户指定的知识点，按以下结构输出：
1. 知识点定位：科目、章节、在 408 考纲中的作用
2. 核心概念：定义、对象、成立条件、与相近概念的区别
3. 原理与过程：分步骤讲清楚“为什么这样”“每一步在做什么”
4. 关键公式或代码：给出 408 常用写法，并说明时间、空间复杂度
5. 典型例子：用一个最小例子演示，不编造真题年份和题号
6. 常见陷阱：至少 3 条，说明错误原因和正确判断
7. 408 真题考法：总结常见命题角度和答题关键词，不虚构具体年份
8. 一句话记忆：用一句话概括最容易忘的结论

要求：
- 用户没有给出具体题干时，不要假设他在问某道题，不要输出“最终答案”。
- 重点讲知识本身，而不是讲“这道题怎么做”。
- 需要引用本地资料时保留来源；资料不足时明确说明。
"""
        answer = self.llm.generate(system_prompt, user_prompt, request.image_base64)
        return AgentResponse(
            intent=Intent.EXPLAIN_CONCEPT,
            answer=answer,
            citations=retrieved,
            next_actions=["生成针对性自测题", "生成带背卡片", "查看关联真题"],
        )
