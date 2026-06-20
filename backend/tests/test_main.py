import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "service": "Universal Browser Assistant API"
        }

def test_auth_happy_path():
    # Use a unique email to avoid conflicts across test runs if DB persists
    test_email = f"test_{int(time.time())}@example.com"
    test_password = "securepassword123"

    with TestClient(app) as client:
        # 1. Register
        reg_response = client.post("/api/auth/register", json={
            "email": test_email,
            "password": test_password
        })
        assert reg_response.status_code == 200
        reg_data = reg_response.json()
        assert reg_data["success"] is True
        assert "token" in reg_data
        
        # 2. Login
        login_response = client.post("/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["success"] is True
        assert "token" in login_data
        assert login_data["user"]["email"] == test_email

def test_chat_unauthorized():
    with TestClient(app) as client:
        response = client.post("/api/chat", json={
            "message": "Hello",
            "url": "https://example.com",
            "sessionId": "123",
            "pageText": "Example text",
            "language": "en"
        })
        # Expecting 401 because no Authorization header is provided
        assert response.status_code == 401
