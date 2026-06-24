from groq import AsyncGroq
from core.config import settings
from typing import Optional

# Initialize client as None, will be instantiated on first use
_client: Optional[AsyncGroq] = None

system_prompt = (
    "You are an AI assistant for 'Coding Junction'. "
    "You must ONLY answer queries related to Coding Junction or IT/Programming. "
    "If a user asks a question that is out of scope (e.g. general knowledge, history, geography), "
    "you MUST return exactly: 'I can only assist with Coding Junction and IT-related queries.'"
)

def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set in .env")
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client

async def generate_response(prompt: str) -> str:
    try:
        client = get_client()
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        return completion.choices[0].message.content or "I couldn't generate a response."
    except ValueError as ve:
        return f"AI Assistant is unavailable: {str(ve)}"
    except Exception as e:
        print(f"AI Service Error: {e}")
        return "Sorry, I'm experiencing some technical difficulties. Please try again later."
