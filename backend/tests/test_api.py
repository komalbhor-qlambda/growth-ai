"""tests/test_api.py — Integration tests."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from app.main import app
from app.core.config import settings


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client):
    resp = await client.post("/api/v1/auth/register", json={
        "full_name": "Test Owner", "email": "test@qlambda.ai",
        "password": "TestPass123", "business_name": "Test Salon",
    })
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["powered_by"] == "Qlambda Technologies LLP"


@pytest.mark.asyncio
async def test_register(client):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Jai Sharma", "email": "jai@jaisalon.in",
        "password": "Secure123", "business_name": "Jai Salon",
    })
    assert r.status_code == 201
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_register_duplicate_email(client, auth_headers):
    r = await client.post("/api/v1/auth/register", json={
        "full_name": "Dupe", "email": "test@qlambda.ai",
        "password": "TestPass123", "business_name": "Dupe Salon",
    })
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_login(client, auth_headers):
    r = await client.post("/api/v1/auth/login", json={"email": "test@qlambda.ai", "password": "TestPass123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/api/v1/auth/login", json={"email": "test@qlambda.ai", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client, auth_headers):
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "test@qlambda.ai"


@pytest.mark.asyncio
async def test_get_tenant(client, auth_headers):
    r = await client.get("/api/v1/tenant/", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["business_name"] == "Test Salon"


@pytest.mark.asyncio
async def test_update_tenant(client, auth_headers):
    r = await client.patch("/api/v1/tenant/", headers=auth_headers,
                           json={"confidence_threshold": 0.75, "hinglish_mode": True})
    assert r.status_code == 200
    assert r.json()["confidence_threshold"] == 0.75


@pytest.mark.asyncio
async def test_chat(client, auth_headers):
    with patch("app.routers.chat.generate_reply", new_callable=AsyncMock) as m:
        m.return_value = {"reply": "₹250 se start!", "confidence": 0.92,
                          "escalated": False, "intent": "pricing", "language": "hinglish", "latency_ms": 400}
        r = await client.post("/api/v1/chat/", headers=auth_headers,
                              json={"message": "Haircut ka price?", "customer_phone": "+919876543210"})
    assert r.status_code == 200
    assert r.json()["escalated"] is False


@pytest.mark.asyncio
async def test_create_lead(client, auth_headers):
    r = await client.post("/api/v1/leads/", headers=auth_headers,
                          json={"name": "Rajesh Kumar", "phone": "+919876543210", "intent": "Haircut pricing"})
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_list_leads(client, auth_headers):
    r = await client.get("/api/v1/leads/", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_get_plans(client, auth_headers):
    r = await client.get("/api/v1/billing/plans", headers=auth_headers)
    assert r.status_code == 200
    assert "starter" in r.json()


@pytest.mark.asyncio
async def test_no_token_rejected(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_invalid_token_rejected(client):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad.token"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_whatsapp_verify(client):
    r = await client.get("/api/v1/whatsapp/webhook", params={
        "hub.mode": "subscribe", "hub.challenge": "abc123",
        "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
    })
    assert r.status_code == 200
