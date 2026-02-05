"""AI service for revising poems based on SME feedback using OpenAI."""

import json
from app.config import settings
from app.services.mock_ai import generate_mock_revision

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


async def generate_revision(
    original_poem: str,
    feedback: str,
    comments: list[dict],
    guide: str
) -> dict:
    """Use OpenAI to revise poem based on feedback and propose guide changes."""

    if settings.use_mock_ai or not settings.openai_api_key or not HAS_OPENAI:
        return generate_mock_revision(original_poem, feedback, comments, guide)

    client = OpenAI(api_key=settings.openai_api_key)

    # Format inline comments clearly
    comments_text = ""
    if comments:
        comments_text = "\n\n## Inline Comments from SME:\n"
        for c in comments:
            comments_text += f'- On the text "{c["highlighted_text"]}": {c["comment"]}\n'

    system_prompt = """You are a poetry revision specialist working with SME (Subject Matter Expert) feedback.

Your job is to:
1. REVISE THE POEM based on the SME's feedback - make REAL changes that address their concerns
2. PROPOSE GUIDE CHANGES that would prevent similar issues in future poems

CRITICAL INSTRUCTIONS:
- If the SME says "never use [word]" or "remove [word]" or "don't use [word]" - you MUST remove/replace that word in the revised poem
- If the SME criticizes something as "cliche" or "overused" - replace it with fresh language
- If the SME asks for more energy/active language - make verbs more active
- If the SME asks for more concrete/sensory details - add specific imagery
- The revised poem should be NOTICEABLY DIFFERENT from the original, addressing ALL feedback points
- Pay close attention to the EXACT words the SME mentions - if they say "never use heartbeats", the word "heartbeats" must NOT appear in your revision

For guide changes, extract rules like:
- "Never use the word X" if they said to avoid a word
- Style preferences they expressed
- Any recurring issues to prevent

You MUST respond in this EXACT JSON format (no markdown code blocks, just raw JSON):
{
    "revised_poem": "the complete revised poem with all feedback applied",
    "proposed_guide_changes": "markdown text with new rules to add to the guide, or null if none needed",
    "rationale": "explain each specific change you made and why"
}"""

    user_message = f"""## Current Poetry Guide:
{guide}

## Original Poem:
{original_poem}

## Overall SME Feedback:
{feedback or "No overall feedback provided"}
{comments_text}

Please revise the poem to address ALL the feedback, and propose any guide changes. Remember to respond with ONLY valid JSON."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        max_tokens=2048,
        temperature=0.7
    )

    response_text = response.choices[0].message.content

    # Parse JSON from response
    try:
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        result = json.loads(response_text.strip())

        # Validate required fields
        if "revised_poem" not in result:
            result["revised_poem"] = original_poem
        if "proposed_guide_changes" not in result:
            result["proposed_guide_changes"] = None
        if "rationale" not in result:
            result["rationale"] = "Changes applied based on SME feedback."

        return result

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Response was: {response_text[:500]}")
        return {
            "revised_poem": original_poem,
            "proposed_guide_changes": None,
            "rationale": f"Failed to parse AI response: {str(e)}"
        }
