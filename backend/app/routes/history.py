from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from app.middleware.auth import get_current_user
from app.db import db
from app.utils import serialize_doc

router = APIRouter()

class HistorySaveRequest(BaseModel):
    domain: Optional[str] = None
    query: Optional[str] = None
    response: Optional[str] = ""
    mode: Optional[str] = "QUERY_MODE"

@router.post("/save")
async def save_history(payload: HistorySaveRequest, current_user: dict = Depends(get_current_user)):
    if not payload.domain or not payload.query:
        raise HTTPException(status_code=400, detail="domain and query required")
    
    try:
        entry_doc = {
            "userId": current_user["id"],
            "email": current_user["email"],
            "domain": payload.domain,
            "query": payload.query,
            "response": payload.response if payload.response is not None else "",
            "mode": payload.mode if payload.mode is not None else "QUERY_MODE",
            "timestamp": datetime.now(timezone.utc)
        }
        result = await db.history.insert_one(entry_doc)
        entry_doc["_id"] = result.inserted_id
        
        return {
            "success": True,
            "entry": serialize_doc(entry_doc)
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to save history"}
        )

@router.get("/{domain}")
async def get_history(domain: str, current_user: dict = Depends(get_current_user)):
    try:
        cursor = db.history.find({"userId": current_user["id"], "domain": domain}) \
            .sort("timestamp", -1) \
            .limit(30)
        entries = await cursor.to_list(length=30)
        return {
            "success": True,
            "history": serialize_doc(entries)
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to fetch history"}
        )
