from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from app.db import init_db
from app.routes import auth, chat, history

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB client and indexes on startup
    await init_db()
    yield

app = FastAPI(title="Universal Browser Assistant API", lifespan=lifespan)

import os

# Enable CORS with explicit origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler to match Express error response structure {"error": ...}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

# Validation error handler to match Express bad request format
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msg = "Validation error"
    if exc.errors():
        err = exc.errors()[0]
        loc = err.get("loc", [])
        field = loc[-1] if loc else "field"
        error_msg = f"{field}: {err.get('msg')}"
    return JSONResponse(
        status_code=400,
        content={"error": error_msg}
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Universal Browser Assistant API"
    }

# Register API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
