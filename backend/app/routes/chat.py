from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_user
from app.services.agent_pipeline import agent_pipeline

router = APIRouter()

class ChatRequest(BaseModel):
    message: Optional[str] = None
    url: Optional[str] = ""
    sessionId: Optional[str] = None
    language: Optional[str] = "auto"
    pageText: Optional[str] = ""

class TranslateRequest(BaseModel):
    texts: Optional[list[str]] = None
    targetLanguage: Optional[str] = None

@router.post("")
async def chat(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not payload.message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    user_id = current_user.get("id")
    session_id = payload.sessionId if payload.sessionId else user_id
    
    try:
        response = await agent_pipeline.process_message(
            user_message=payload.message,
            url_context=payload.url,
            session_id=session_id,
            language=payload.language,
            page_text=payload.pageText
        )
        return {
            "success": True,
            "data": response
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to process request"
            }
        )

@router.post("/translate-bulk")
async def translate_bulk(payload: TranslateRequest, current_user: dict = Depends(get_current_user)):
    if not payload.texts or not payload.targetLanguage:
        raise HTTPException(status_code=400, detail="Texts and targetLanguage are required")
    
    try:
        translations = await agent_pipeline.translate_bulk(payload.texts, payload.targetLanguage)
        return {
            "success": True,
            "translations": translations
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to translate"
            }
        )
