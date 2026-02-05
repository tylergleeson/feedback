"""AI service for generating poems using OpenAI."""

from app.config import settings
from app.services.mock_ai import generate_mock_poem

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


async def generate_poem(prompt: str, guide: str) -> str:
    """Generate a poem using OpenAI, following the guide strictly."""

    if settings.use_mock_ai or not settings.openai_api_key or not HAS_OPENAI:
        return generate_mock_poem(prompt, guide)

    client = OpenAI(api_key=settings.openai_api_key)

    system_prompt = f"""You are a poet. Generate poems following this guide EXACTLY:

{guide}

CRITICAL RULES:
1. Follow ALL rules in the guide, especially any "never use" or "avoid" instructions
2. If the guide says to never use a word, DO NOT use that word under any circumstances
3. Apply all style guidance from the guide
4. Generate only the poem itself - no titles, no explanations, no meta-commentary
5. Keep poems concise (6-12 lines typically)"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Write a poem about: {prompt}"}
        ],
        max_tokens=1024,
        temperature=0.7
    )

    return response.choices[0].message.content.strip()
