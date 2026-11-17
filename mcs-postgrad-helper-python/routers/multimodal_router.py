from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.multimodal_service import MultimodalService

router = APIRouter(prefix="/api/ai", tags=["多模态图文问答与解析"])

class MultimodalQARequest(BaseModel):
    question_text: str
    image_base64: Optional[str] = None
    subject_hint: Optional[str] = None

@router.post("/multimodal-qa")
async def multimodal_qa(req: MultimodalQARequest):
    result = await MultimodalService.analyze_image_qa(
        question_text=req.question_text,
        image_base64=req.image_base64,
        subject_hint=req.subject_hint
    )
    return {
        "code": 200,
        "message": "多模态题目解析完成",
        "data": result
    }
