from fastapi import APIRouter, HTTPException
from models.schemas import SubjectiveGradingRequest, SubjectiveGradingData
from services.rubric_grading_service import RubricGradingService

router = APIRouter(prefix="/api/ai", tags=["408主观题智能阅卷"])

@router.post("/grade-subjective")
async def grade_subjective(req: SubjectiveGradingRequest):
    try:
        data = await RubricGradingService.grade_subjective_question(req)
        return {
            "code": 200,
            "message": "主观题采分点评阅成功",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

