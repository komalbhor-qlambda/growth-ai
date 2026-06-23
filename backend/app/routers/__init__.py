from app.routers.auth      import router as auth_router
from app.routers.tenant    import router as tenant_router
from app.routers.chat      import router as chat_router
from app.routers.leads     import router as leads_router
from app.routers.knowledge import router as kb_router
from app.routers.billing   import router as billing_router
from app.routers.whatsapp  import router as wa_router
from app.routers.analytics import router as analytics_router

__all__ = [
    "auth_router","tenant_router","chat_router","leads_router",
    "kb_router","billing_router","wa_router","analytics_router",
]
