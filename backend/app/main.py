"""app/main.py — FastAPI application factory."""
import time
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import init_db
from app.routers import (
    auth_router, tenant_router, chat_router,
    leads_router, kb_router, billing_router,
    wa_router, analytics_router,
)

log = structlog.get_logger()

if settings.SENTRY_DSN and settings.is_production:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2, environment=settings.APP_ENV)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", env=settings.APP_ENV)
    if not settings.is_production:
        await init_db()
    from app.services.rag import ensure_collection
    await ensure_collection()
    yield
    log.info("shutdown")


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="WhatsApp-first AI sales & support for Indian SMEs. Powered by Qlambda Technologies LLP.",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.is_production:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    ms = int((time.perf_counter() - t0) * 1000)
    log.info("http", method=request.method, path=request.url.path, status=response.status_code, ms=ms)
    response.headers["X-Response-Time"] = f"{ms}ms"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def generic_error(request: Request, exc: Exception):
    log.error("unhandled", path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


V1 = "/api/v1"
app.include_router(auth_router,      prefix=V1)
app.include_router(tenant_router,    prefix=V1)
app.include_router(chat_router,      prefix=V1)
app.include_router(leads_router,     prefix=V1)
app.include_router(kb_router,        prefix=V1)
app.include_router(billing_router,   prefix=V1)
app.include_router(wa_router,        prefix=V1)
app.include_router(analytics_router, prefix=V1)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV, "powered_by": "Qlambda Technologies LLP"}


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/docs", "powered_by": "Qlambda Technologies LLP"}
