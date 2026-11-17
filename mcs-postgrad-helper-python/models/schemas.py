from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ----------------- 408 主观题智能阅卷模型 -----------------
class SubjectiveGradingRequest(BaseModel):
    question_id: str = Field(..., description="题目ID，例如 exam-2024-41")
    max_score: int = Field(..., description="本题满分，如 13, 15")
    stem: str = Field(..., description="试题题干与小问要求")
    standard_answer: Optional[str] = Field("", description="标准参考答案")
    explanation: Optional[str] = Field("", description="解析")
    user_answer: str = Field(..., description="考生提交的答案（含文字论述、C/C++代码等）")
    sub_questions: Optional[List[Dict[str, Any]]] = Field(default=[], description="小问采分点要求")

class RubricItemDetail(BaseModel):
    rubric_id: int
    point_desc: str
    max_score: float
    earned_score: float
    hit: bool
    reason: str

class SubjectiveGradingData(BaseModel):
    question_id: str
    max_score: int
    score: float
    feedback: str
    missing_points: List[str]
    error_analysis: str
    rubric_matched: List[RubricItemDetail]
    advice: str

# ----------------- AI 备考 Agent 流程模型 -----------------
class AgentStartRequest(BaseModel):
    user_id: int = 1
    instruction: str = Field(..., description="复习指令，如：'帮我复习操作系统虚存与页面置换算法'")
    target_subject: Optional[str] = Field("os", description="ds, co, os, cn")
    difficulty: Optional[str] = Field("MEDIUM", description="EASY, MEDIUM, HARD")

class AgentStepRequest(BaseModel):
    session_id: int = Field(..., description="会话ID")
    action: str = Field(..., description="动作: NEXT_STEP, SUBMIT_PRACTICE, PAUSE, RESUME, RETRY")
    user_response: Optional[str] = Field("", description="用户回答或反馈")

class AgentSessionVO(BaseModel):
    session_id: int
    title: str
    current_stage: str
    stage_name: str
    difficulty_level: str
    stage_content: Dict[str, Any]
    progress_percent: int
    is_paused: bool
    is_completed: bool

# ----------------- 图文多模态与RAG问答模型 -----------------
class CitationVO(BaseModel):
    doc_id: int
    doc_title: str
    page: Optional[int] = None
    snippet: str

class QARequest(BaseModel):
    user_id: int = 1
    session_id: Optional[int] = None
    question: str
    subject_code: Optional[str] = None
    image_urls: Optional[List[str]] = Field(default=[], description="多模态插图或真题截图")

class QAResponse(BaseModel):
    session_id: int
    answer: str
    citations: List[CitationVO]
    tokens_used: int

