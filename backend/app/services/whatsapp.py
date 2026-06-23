"""app/services/whatsapp.py — Meta WhatsApp Business API."""
import httpx
from app.core.config import settings

BASE_URL = f"{settings.WHATSAPP_API_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
HEADERS  = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}", "Content-Type": "application/json"}


async def send_text_message(to: str, text: str) -> dict:
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type":    "individual",
        "to":   to.replace("+", "").replace(" ", ""),
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(BASE_URL, json=payload, headers=HEADERS)
        r.raise_for_status()
        return r.json()


def parse_incoming_webhook(payload: dict) -> list[dict]:
    messages = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                text = None
                if msg.get("type") == "text":
                    text = msg.get("text", {}).get("body", "")
                messages.append({
                    "from":       msg.get("from"),
                    "message_id": msg.get("id"),
                    "type":       msg.get("type"),
                    "text":       text,
                    "contacts":   value.get("contacts", []),
                })
    return messages


async def transcribe_audio(audio_bytes: bytes) -> str:
    import io
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    result = await client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.ogg", io.BytesIO(audio_bytes), "audio/ogg"),
        language="hi",
        response_format="text",
    )
    return result.strip()
