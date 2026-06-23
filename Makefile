.PHONY: help dev stop build migrate test logs shell

help:
	@echo "SME Growth AI — Commands"
	@echo "─────────────────────────────────────────"
	@echo "  make dev        Start full stack (hot reload)"
	@echo "  make stop       Stop all containers"
	@echo "  make build      Rebuild Docker images"
	@echo "  make migrate    Run Alembic migrations"
	@echo "  make test       Run pytest suite"
	@echo "  make logs       Tail API logs"
	@echo "  make shell      Open shell in API container"

dev:
	cp -n backend/.env.example backend/.env 2>/dev/null || true
	docker-compose up --build -d
	@echo ""
	@echo "✓ Frontend : http://localhost:80"
	@echo "✓ API      : http://localhost:8000"
	@echo "✓ API Docs : http://localhost:8000/docs"
	@echo "✓ Qdrant   : http://localhost:6333/dashboard"

stop:
	docker-compose down

build:
	docker-compose build --no-cache

migrate:
	docker-compose exec api alembic upgrade head

migrate-create:
	@read -p "Migration name: " name; docker-compose exec api alembic revision --autogenerate -m "$$name"

test:
	docker-compose exec api pytest tests/ -v --tb=short

logs:
	docker-compose logs -f api

logs-all:
	docker-compose logs -f

shell:
	docker-compose exec api /bin/bash

psql:
	docker-compose exec postgres psql -U postgres -d sme_growth_ai

clean:
	docker-compose down -v --remove-orphans
	docker image prune -f
