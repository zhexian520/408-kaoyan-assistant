from fastapi import APIRouter, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List
from services.rag_knowledge_service import RagKnowledgeService

router = APIRouter(prefix="/api/ai", tags=["RAG私有知识库与资料管理"])

class RagSearchRequest(BaseModel):
    query: str
    subject_code: Optional[str] = None
    user_id: Optional[int] = None

class InternalRagRequest(BaseModel):
    query: str
    collection: str = "knowledge_points"
    subject: Optional[str] = None
    k: int = 5
    user_id: Optional[int] = None

@router.get("/kb/documents")
async def list_kb_documents(
    user_id: Optional[int] = Query(2),
    is_public: Optional[int] = Query(None),
    subject_code: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None)
):
    """获取私有及公共知识库资料列表"""
    docs = RagKnowledgeService.list_documents(
        user_id=user_id,
        is_public=is_public,
        subject_code=subject_code,
        keyword=keyword
    )
    return {
        "code": 200,
        "message": "获取知识库资料列表成功",
        "data": docs
    }

@router.get("/kb/documents/{doc_id}")
async def get_kb_document_detail(doc_id: int, user_id: Optional[int] = Query(None)):
    """获取文档详情及切片列表"""
    detail = RagKnowledgeService.get_document_detail(doc_id, user_id=user_id)
    if not detail:
        return {"code": 404, "message": "文档未找到", "data": None}
    return {
        "code": 200,
        "message": "获取文档详情成功",
        "data": detail
    }

@router.post("/kb/upload")
async def upload_kb_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject_code: str = Form("DS"),
    is_public: int = Form(0),
    user_id: int = Form(2)
):
    """用户自主上传教材/讲义文件并完成智能切片解析"""
    content_bytes = await file.read()
    doc_title = title.strip() if title and title.strip() else file.filename
    res = RagKnowledgeService.parse_and_save_upload(
        filename=file.filename,
        content_bytes=content_bytes,
        title=doc_title,
        subject_code=subject_code,
        is_public=is_public,
        user_id=user_id
    )
    return {
        "code": 200,
        "message": "资料已成功上传并完成智能考点切片入库",
        "data": res
    }

@router.post("/kb/import-presets")
async def import_preset_textbooks(user_id: int = Query(2)):
    """一键极速收录 408 本地四大权威考研教材至知识库"""
    imported = RagKnowledgeService.import_preset_408_textbooks(user_id=user_id)
    return {
        "code": 200,
        "message": f"成功收录 {len(imported)} 部权威教材资料至知识库",
        "data": imported
    }

@router.delete("/kb/documents/{doc_id}")
async def delete_kb_document(doc_id: int, user_id: Optional[int] = Query(None)):
    """删除知识库资料及其切片"""
    ok = RagKnowledgeService.delete_document(doc_id, user_id=user_id)
    if not ok:
        return {"code": 403, "message": "无权删除该资料，或公共资料不可由用户删除", "data": False}
    return {
        "code": 200,
        "message": "资料已从知识库彻底移除",
        "data": True
    }

@router.put("/kb/documents/{doc_id}/toggle-public")
async def toggle_document_privacy(doc_id: int, user_id: Optional[int] = Query(None)):
    """切换资料公开/私有状态"""
    ok = RagKnowledgeService.toggle_public(doc_id, user_id=user_id)
    if not ok:
        return {"code": 403, "message": "无权修改该资料，或公共资料不可由用户切换", "data": False}
    return {
        "code": 200,
        "message": "知识库资料公开权限已更新",
        "data": True
    }

@router.post("/rag/search")
async def internal_rag_search(req: InternalRagRequest):
    """统一 MySQL RAG 检索（供 408 Pilot Agent 内部调用）。"""
    items = RagKnowledgeService.search_chunks(
        query=req.query,
        collection=req.collection,
        subject_code=req.subject,
        top_k=req.k,
        user_id=req.user_id,
    )
    return {"code": 200, "message": "RAG 检索完成", "data": items}

@router.post("/kb/search")
async def search_knowledge_base(req: RagSearchRequest):
    """知识库 RAG 溯源检索 (大模型驱动 + 原文高亮切片)"""
    result = await RagKnowledgeService.search_and_ground(
        query=req.query,
        subject_code=req.subject_code,
        user_id=req.user_id
    )
    return {
        "code": 200,
        "message": "知识库检索完成",
        "data": result
    }
