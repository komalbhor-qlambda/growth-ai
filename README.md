# SME Growth AI — Complete Full-Stack Application
**Powered by Qlambda Technologies LLP**

WhatsApp-first AI Sales & Support platform for Indian SMEs. Full-stack monorepo with FastAPI backend + React frontend, self-hosted on Docker.

---

## Quick Start (3 commands)

```bash
# 1. Clone and enter the project
cd sme-complete

# 2. Add your API keys
cp backend/.env.example backend/.env
nano backend/.env   # Add ANTHROPIC_API_KEY, OPENAI_API_KEY, RAZORPAY keys

# 3. Start everything
make dev
```

Open http://localhost — the app is live.

---

## Project Structure

```
sme-complete/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       ← Pydantic settings (reads .env)
│   │   │   ├── database.py     ← Async SQLAlchemy engine + session
│   │   │   └── security.py     ← JWT, bcrypt, auth dependencies
│   │   ├── models/
│   │   │   ├── __init__.py     ← Re-exports all models
│   │   │   └── tenant.py       ← Tenant, User, Lead, KBDocument, Conversation, Invoice
│   │   ├── schemas/
│   │   │   ├── __init__.py     ← Re-exports all schemas
│   │   │   ├── auth.py
│   │   │   ├── tenant.py
│   │   │   ├── lead.py
│   │   │   ├── knowledge.py
│   │   │   ├── chat.py
│   │   │   └── billing.py
│   │   ├── services/
│   │   │   ├── rag.py          ← Embed → Qdrant retrieve → Claude generate
│   │   │   ├── ingestion.py    ← PDF/DOCX/URL → chunk → upsert Qdrant
│   │   │   ├── payment.py      ← Razorpay order/verify/webhook
│   │   │   └── whatsapp.py     ← Meta API send/receive + Whisper STT
│   │   ├── routers/
│   │   │   ├── auth.py         ← POST /auth/register,login,refresh,logout
│   │   │   ├── tenant.py       ← GET/PATCH /tenant/
│   │   │   ├── chat.py         ← POST /chat/
│   │   │   ├── leads.py        ← CRUD + bulk CSV import
│   │   │   ├── knowledge.py    ← Upload PDF/DOCX, index URL, delete
│   │   │   ├── billing.py      ← Plans, orders, verify, webhook, invoices
│   │   │   ├── whatsapp.py     ← GET/POST /whatsapp/webhook
│   │   │   └── analytics.py    ← GET /analytics/dashboard
│   │   ├── workers/
│   │   │   ├── celery_app.py   ← Celery config + beat schedule
│   │   │   └── tasks.py        ← ingest_document_task, reset_monthly_usage
│   │   └── main.py             ← FastAPI app factory
│   ├── alembic/
│   │   ├── env.py              ← Async Alembic environment
│   │   └── versions/
│   │       └── 001_initial.py  ← Creates all 6 tables
│   ├── tests/
│   │   └── test_api.py         ← 16 pytest-asyncio integration tests
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   ├── pytest.ini
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js       ← Axios + JWT refresh interceptor + all API methods
│   │   ├── components/
│   │   │   ├── ui.jsx          ← Button, Input, Card, Badge, Modal, Toggle, Spinner…
│   │   │   └── Sidebar.jsx     ← Nav, usage meter, Qlambda brand
│   │   ├── context/
│   │   │   └── authStore.js    ← Zustand: user, tenant, login, logout, refresh
│   │   ├── hooks/
│   │   │   └── index.js        ← useRequireAuth, useDebounce, usePageTitle
│   │   ├── pages/
│   │   │   ├── Auth.jsx        ← Login + Register (react-hook-form + Zod)
│   │   │   ├── Overview.jsx    ← KPI dashboard + Recharts
│   │   │   ├── Leads.jsx       ← CRUD + search + filter + bulk CSV import
│   │   │   ├── Chats.jsx       ← Live RAG chat (calls /api/v1/chat/)
│   │   │   ├── KnowledgeBase.jsx ← Drag-drop upload + URL indexing
│   │   │   ├── Subscription.jsx  ← Razorpay UPI billing + invoices
│   │   │   └── Settings.jsx    ← Tenant config wired to PATCH /tenant/
│   │   ├── App.jsx             ← React Router + protected route guard
│   │   ├── main.jsx            ← ReactDOM entry, QueryClient, Toaster
│   │   └── index.css           ← Tailwind + custom component classes
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml          ← All 6 services
├── Makefile                    ← Dev shortcuts
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register tenant + owner user |
| POST | `/api/v1/auth/login` | Get access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| GET  | `/api/v1/auth/me` | Current user profile |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET  | `/api/v1/tenant/` | Get tenant config |
| PATCH| `/api/v1/tenant/` | Update AI settings |
| POST | `/api/v1/chat/` | RAG chat — message in, AI reply out |
| GET  | `/api/v1/leads/` | List leads (paginated, filtered) |
| POST | `/api/v1/leads/` | Create lead manually |
| PATCH| `/api/v1/leads/{id}` | Update lead |
| DELETE | `/api/v1/leads/{id}` | Delete lead |
| POST | `/api/v1/leads/import` | Bulk CSV import |
| GET  | `/api/v1/knowledge/` | List KB documents |
| POST | `/api/v1/knowledge/upload` | Upload PDF/DOCX/TXT |
| POST | `/api/v1/knowledge/url` | Index a website URL |
| DELETE | `/api/v1/knowledge/{id}` | Remove document + vectors |
| GET  | `/api/v1/billing/plans` | Plan tiers and pricing |
| POST | `/api/v1/billing/orders` | Create Razorpay order |
| POST | `/api/v1/billing/verify` | Verify payment signature |
| POST | `/api/v1/billing/webhook/razorpay` | Razorpay event webhooks |
| GET  | `/api/v1/billing/invoices` | Invoice history |
| GET  | `/api/v1/whatsapp/webhook` | Meta verification handshake |
| POST | `/api/v1/whatsapp/webhook` | Incoming messages |
| GET  | `/api/v1/analytics/dashboard` | Dashboard KPIs |
| GET  | `/health` | Health check |

---

## Environment Variables (Required)

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | 256-bit random — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | For embeddings + Whisper STT |
| `RAZORPAY_KEY_ID` | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret |
| `WHATSAPP_TOKEN` | Meta permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Your webhook verify token |

Database, Redis, and Qdrant connect automatically via docker-compose — no extra config needed for local dev.

---

## VPS Deployment (DigitalOcean)

```bash
# 1. SSH into a fresh Ubuntu 22.04 droplet (2GB RAM minimum)
ssh root@YOUR_VPS_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# 3. Upload project
scp -r ./sme-complete root@YOUR_VPS_IP:/opt/sme-growth-ai

# 4. Configure and start
cd /opt/sme-growth-ai
cp backend/.env.example backend/.env
nano backend/.env           # Add your real API keys
make dev
make migrate

# 5. SSL with Certbot (optional)
apt install -y certbot
certbot certonly --standalone -d yourdomain.com
```

---

## Running Tests

```bash
make test
# or directly:
docker-compose exec api pytest tests/ -v
```

---

## Multi-Tenancy

Every database row has a `tenant_id`. Qdrant vectors are namespaced by `tenant_id` in the payload filter — cross-tenant leakage is impossible at the query level. JWT tokens embed `tenant_id` so all API filters are automatically scoped server-side. Supports 100 concurrent tenants on a 2GB VPS with the default connection pool (20 async connections).

---

*Powered by Qlambda Technologies LLP*
