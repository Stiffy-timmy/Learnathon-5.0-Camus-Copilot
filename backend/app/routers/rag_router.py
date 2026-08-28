from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth import get_current_user, get_optional_current_user
from app.rag_engine import query_rag_engine, create_escalation_ticket, load_live_handbook_docs

router = APIRouter(prefix="/api/rag", tags=["RAG Knowledge Chatbot"])

class RAGQueryRequest(BaseModel):
    query: str

class RAGEscalateRequest(BaseModel):
    query: str
    details: Optional[str] = None

@router.post("/query")
def process_rag_query(req: RAGQueryRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    user_id = current_user.get("id") if current_user else "anonymous"
    user_email = current_user.get("email") if current_user else "hacker@hackathon.com"
    
    result = query_rag_engine(req.query, user_id=user_id, user_email=user_email)
    return result

@router.post("/escalate")
def escalate_to_organizers(req: RAGEscalateRequest, current_user: Optional[dict] = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user else "anonymous"
    user_email = current_user.get("email") if current_user else "hacker@hackathon.com"
    user_name = current_user.get("name") if current_user else (user_email.split('@')[0] if user_email else "Participant")
    team_name = current_user.get("teamName") or current_user.get("team_name") if current_user else None
    
    escalation_id = create_escalation_ticket(
        query=req.query, 
        user_id=user_id, 
        user_email=user_email, 
        user_name=user_name,
        team_name=team_name,
        score=0.0
    )
    return {
        "success": True,
        "escalationId": escalation_id,
        "answer": (
            f"✅ **Ticket #{escalation_id} Created Successfully!**\n\n"
            "An event organizer has been notified and will assist you shortly. "
            "You can also visit **Help Desk B** in Block B or ask in Discord `#ask-organizers`."
        ),
        "isEscalated": True
    }

@router.get("/knowledge")
def list_knowledge_topics():
    kb = load_live_handbook_docs()
    topics = [{"id": doc.get("id"), "topic": doc.get("topic"), "category": doc.get("category")} for doc in kb]
    return {"topics": topics, "count": len(topics)}
