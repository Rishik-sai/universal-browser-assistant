from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db import db
from app.utils import hash_password, verify_password, sign_token
from app.limiter import limiter

router = APIRouter()

class AuthModel(BaseModel):
    email: str = None
    password: str = None

@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, payload: AuthModel):
    email = payload.email
    password = payload.password
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    
    email_clean = email.strip().lower()
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists. Please login.")
    
    hashed = hash_password(password)
    user_doc = {
        "email": email_clean,
        "password": hashed,
        "createdAt": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = sign_token(user_id, email_clean)
    
    return {
        "success": True,
        "token": token,
        "user": {
            "email": email_clean,
            "id": user_id
        }
    }

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, payload: AuthModel):
    email = payload.email
    password = payload.password
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    
    email_clean = email.strip().lower()
    user = await db.users.find_one({"email": email_clean})
    if not user:
        raise HTTPException(status_code=401, detail="No account found. Please register first.")
    
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    
    user_id = str(user["_id"])
    token = sign_token(user_id, email_clean)
    
    return {
        "success": True,
        "token": token,
        "user": {
            "email": email_clean,
            "id": user_id
        }
    }
