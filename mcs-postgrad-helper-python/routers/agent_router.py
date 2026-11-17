from fastapi import APIRouter, HTTPException
from models.schemas import AgentStartRequest, AgentStepRequest, AgentSessionVO
from services.agent_flow_service import AgentFlowService

router = APIRouter(prefix="/api/ai/agent", tags=["AI备考Agent"])

@router.post("/start")
async def start_agent_flow(req: AgentStartRequest):
    try:
        session_vo = await AgentFlowService.start_flow(req)
        return {
            "code": 200,
            "message": "备考Agent任务启动成功",
            "data": session_vo
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/step")
async def step_agent_flow(req: AgentStepRequest):
    try:
        session_vo = await AgentFlowService.handle_step(req)
        return {
            "code": 200,
            "message": "Agent状态机推进成功",
            "data": session_vo
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

