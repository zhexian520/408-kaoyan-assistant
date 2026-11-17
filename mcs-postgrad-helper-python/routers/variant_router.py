from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
from services.variant_generator_service import VariantGeneratorService

router = APIRouter(prefix="/api/ai", tags=["408考点变式练习题生成与错题录入"])

class VariantRequest(BaseModel):
    base_question_id: Optional[Union[str, int]] = None
    subject_code: Optional[str] = "DS"
    base_stem: Optional[str] = None
    base_options: Optional[List[Union[Dict[str, Any], str]]] = None
    base_answer: Optional[str] = None
    base_explanation: Optional[str] = None
    question_type: Optional[str] = None
    year: Optional[int] = None
    question_number: Optional[int] = None
    chapter_name: Optional[str] = None
    variation_mode: Optional[str] = "REVERSE_PARAMETER"

class WrongQuestionRequest(BaseModel):
    user_id: Optional[int] = 1
    question_id: Optional[str] = None
    subject_code: Optional[str] = "ds"
    custom_question_json: Optional[Union[Dict[str, Any], str]] = None
    source_type: Optional[str] = "VARIANT"  # VARIANT, EXAM_PRACTICE, MOCK, TEST
    error_reason_tag: Optional[str] = "CONCEPT_CONFUSION"
    user_notes: Optional[str] = "错题自动收录"
    last_wrong_answer: Optional[str] = ""

@router.post("/generate-variant")
async def generate_variant(req: VariantRequest):
    try:
        result = await VariantGeneratorService.generate_variant_question(
            base_question_id=str(req.base_question_id) if req.base_question_id is not None else None,
            subject_code=req.subject_code,
            base_stem=req.base_stem,
            base_options=req.base_options,
            base_answer=req.base_answer,
            base_explanation=req.base_explanation,
            question_type=req.question_type,
            year=req.year,
            question_number=req.question_number,
            chapter_name=req.chapter_name,
            variation_mode=req.variation_mode
        )
    except Exception as exc:
        print(f"[!] 变式题生成失败: {exc}")
        raise HTTPException(status_code=502, detail=str(exc) or "变式题生成失败，请稍后重试")
    return {
        "code": 200,
        "message": "变式练习题生成成功",
        "data": result
    }

@router.post("/wrong-question")
async def save_wrong_question(req: WrongQuestionRequest):
    success = VariantGeneratorService.save_wrong_question({
        "user_id": req.user_id or 1,
        "question_id": req.question_id,
        "subject_code": req.subject_code,
        "custom_question_json": req.custom_question_json,
        "source_type": req.source_type,
        "error_reason_tag": req.error_reason_tag,
        "user_notes": req.user_notes,
        "last_wrong_answer": req.last_wrong_answer
    })
    if success:
        return {"code": 200, "message": "已自动收录至个人错题本"}
    return {"code": 500, "message": "收录错题失败"}
