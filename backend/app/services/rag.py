"""app/services/rag.py — Embed, retrieve, generate with Claude."""
import time, re
from typing import Optional
import structlog
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
)
from app.core.config import settings

log = structlog.get_logger()
_openai    = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
_anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
_qdrant    = AsyncQdrantClient(
    host=settings.QDRANT_HOST,
    port=settings.QDRANT_PORT,
    api_key=settings.QDRANT_API_KEY,
)
COLLECTION = settings.QDRANT_COLLECTION
DIMS       = settings.EMBEDDING_DIMENSIONS


async def ensure_collection():
    existing = await _qdrant.get_collections()
    if COLLECTION not in [c.name for c in existing.collections]:
        await _qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=DIMS, distance=Distance.COSINE),
        )
        log.info("qdrant_collection_created", collection=COLLECTION)


async def embed_text(text: str) -> list[float]:
    r = await _openai.embeddings.create(model=settings.EMBEDDING_MODEL, input=text.strip())
    return r.data[0].embedding


async def embed_batch(texts: list[str]) -> list[list[float]]:
    r = await _openai.embeddings.create(model=settings.EMBEDDING_MODEL, input=[t.strip() for t in texts])
    return [i.embedding for i in sorted(r.data, key=lambda x: x.index)]


async def upsert_chunks(tenant_id: str, document_id: str, chunks: list[str]) -> int:
    await ensure_collection()
    vectors = await embed_batch(chunks)
    points = [
        PointStruct(
            id=f"{document_id}_{i}",
            vector=vec,
            payload={"tenant_id": tenant_id, "document_id": document_id, "text": chunk, "chunk_index": i},
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    await _qdrant.upsert(collection_name=COLLECTION, points=points)
    return len(points)


async def delete_document_chunks(document_id: str):
    await _qdrant.delete(
        collection_name=COLLECTION,
        points_selector=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]),
    )


async def retrieve_context(query: str, tenant_id: str, top_k: int = None) -> list[str]:
    top_k = top_k or settings.MAX_CONTEXT_CHUNKS
    qv = await embed_text(query)
    results = await _qdrant.search(
        collection_name=COLLECTION,
        query_vector=qv,
        limit=top_k,
        query_filter=Filter(must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]),
        with_payload=True,
    )
    return [h.payload["text"] for h in results if h.score > 0.40]


def detect_language(text: str) -> str:
    hindi_chars = re.findall(r"[\u0900-\u097F]", text)
    total = len([c for c in text if c.isalpha()])
    if not total:
        return "english"
    ratio = len(hindi_chars) / total
    if ratio > 0.5:
        return "hindi"
    hinglish_words = ["kya","hai","ka","ki","ko","se","mein","bhai","yaar","ji","aur","nahi"]
    if ratio > 0.05 or any(w in text.lower() for w in hinglish_words):
        return "hinglish"
    return "english"


def detect_intent(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["price","cost","kitna","rate","charge","fees","paisa","rupee","₹"]):
        return "pricing"
    if any(w in t for w in ["book","appointment","slot","time","schedule","fix","confirm"]):
        return "booking"
    if any(w in t for w in ["where","location","address","kahan","direction","map"]):
        return "location"
    if any(w in t for w in ["complain","complaint","problem","issue","bad","worst","refund"]):
        return "complaint"
    if any(w in t for w in ["owner","manager","boss","talk","baat"]):
        return "escalation"
    return "general"


def should_escalate(text: str, confidence: float, keywords: str, threshold: float) -> bool:
    kws = [k.strip().lower() for k in keywords.split(",")]
    if any(k in text.lower() for k in kws):
        return True
    return confidence < threshold


def estimate_confidence(chunks: list[str]) -> float:
    if not chunks:     return 0.30
    if len(chunks)>=3: return 0.92
    if len(chunks)==2: return 0.78
    return 0.62


SYSTEM_TEMPLATE = """You are an AI assistant for "{business_name}", an Indian SME.
Persona: {persona}
Location: {location} | WhatsApp: {whatsapp} | Website: {website}
Knowledge base context:
{context}
Rules:
1. Reply in {language} — Hinglish preferred if customer writes in Hindi/Hinglish.
2. Keep replies to 1-4 sentences max.
3. Be warm. Use "ji" when appropriate.
4. Only answer from context. If unsure say "Main confirm karke batata hoon 🙏"
5. End with a follow-up question or helpful offer."""


async def generate_reply(message: str, tenant, conversation_history: list[dict]) -> dict:
    t0 = time.monotonic()
    language = detect_language(message)
    intent   = detect_intent(message)
    chunks   = await retrieve_context(message, tenant.id)
    confidence = estimate_confidence(chunks)

    system = SYSTEM_TEMPLATE.format(
        business_name=tenant.business_name,
        persona=tenant.ai_persona,
        location=tenant.location or "Not specified",
        whatsapp=tenant.whatsapp_number or "Not specified",
        website=tenant.website or "Not specified",
        context="\n---\n".join(chunks) if chunks else "No specific info in knowledge base.",
        language=language,
    )
    messages = []
    for turn in conversation_history[-6:]:
        role = "user" if turn.get("from") == "customer" else "assistant"
        messages.append({"role": role, "content": turn.get("text", "")})
    messages.append({"role": "user", "content": message})

    response = await _anthropic.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=300,
        system=system,
        messages=messages,
    )
    reply = response.content[0].text.strip()
    escalated = should_escalate(message, confidence, tenant.escalation_keywords, tenant.confidence_threshold)
    latency_ms = int((time.monotonic() - t0) * 1000)

    return {
        "reply": reply, "confidence": confidence, "escalated": escalated,
        "intent": intent, "language": language, "latency_ms": latency_ms,
    }
