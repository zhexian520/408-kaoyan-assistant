from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.study_plan_service import StudyPlanService

router = APIRouter(prefix="/api/ai", tags=["备考规划生成"])

class PlanGenerateRequest(BaseModel):
    prep_duration_months: Optional[int] = 6
    base_level: Optional[str] = "MEDIUM"
    target_score: Optional[int] = 125

class DailyChecklistRequest(BaseModel):
    user_id: Optional[int] = 2
    target_school: Optional[str] = "清华大学"
    target_score: Optional[int] = 125
    exam_year: Optional[int] = 2026
    days_until_exam: Optional[int] = 42
    total_tests: Optional[int] = 0
    avg_score: Optional[float] = 0.0
    wrong_count: Optional[int] = 0
    weak_points: Optional[List[str]] = None
    subject_mastery: Optional[List[Dict[str, Any]]] = None

@router.post("/plan/generate")
def generate_study_plan(req: PlanGenerateRequest):
    result = StudyPlanService.generate_plan(
        prep_duration_months=req.prep_duration_months,
        base_level=req.base_level,
        target_score=req.target_score
    )
    return {
        "code": 200,
        "message": "备考规划生成完成",
        "data": result
    }

@router.post("/plan/daily-checklist")
async def generate_daily_checklist(req: DailyChecklistRequest):
    result = await StudyPlanService.generate_daily_checklist(
        user_id=req.user_id or 2,
        target_school=req.target_school or "清华大学",
        target_score=req.target_score or 125,
        exam_year=req.exam_year or 2026,
        days_until_exam=req.days_until_exam or 42,
        total_tests=req.total_tests or 0,
        avg_score=req.avg_score or 0.0,
        wrong_count=req.wrong_count or 0,
        weak_points=req.weak_points,
        subject_mastery=req.subject_mastery
    )
    return {
        "code": 200,
        "message": "今日 AI 学习清单自适应生成成功",
        "data": result
    }
