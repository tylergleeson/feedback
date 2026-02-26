"""AI Interviewer service for conducting voice feedback conversations."""

import json
from typing import List, Dict, Optional
from app.config import settings

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


class AIInterviewer:
    """
    AI Interviewer that conducts natural conversations with SMEs to extract
    structured feedback about poems.
    """

    def __init__(self, poem_content: str, guide_content: str):
        self.poem_content = poem_content
        self.guide_content = guide_content
        self.conversation_history: List[Dict[str, str]] = []

    async def get_initial_greeting(self) -> Dict:
        """Generate initial greeting and first question."""
        greeting = f"""Hello! I'm here to help you provide feedback on this poem. Instead of filling out forms, let's just have a conversation about what you noticed.

I'll ask you questions to understand your thoughts, and I'll extract the specific feedback items as we talk. When we're done, you'll get a chance to review everything I've captured.

Here's the poem we'll be discussing:

{self.poem_content}

To start: What are your initial thoughts? What stands out to you most?"""

        return {
            "follow_up_question": greeting,
            "extracted_items": [],
            "is_complete": False
        }

    async def get_response(self, sme_message: str) -> Dict:
        """
        Process SME message and return follow-up question with extracted items.

        Returns:
            Dict with keys:
                - follow_up_question: str - Next question to ask
                - extracted_items: List[Dict] - Feedback items extracted from this exchange
                - is_complete: bool - Whether conversation should end
        """
        # Add SME message to history
        self.conversation_history.append({
            "role": "sme",
            "content": sme_message
        })

        # Use mock if no API key
        if settings.use_mock_ai or not settings.openai_api_key or not HAS_OPENAI:
            from app.services.mock_ai_interviewer import generate_mock_response
            return await generate_mock_response(sme_message, self.conversation_history, self.poem_content)

        # Build conversation context
        conversation_text = "\n".join([
            f"{'SME' if msg['role'] == 'sme' else 'AI'}: {msg['content']}"
            for msg in self.conversation_history
        ])

        system_prompt = f"""You are an expert poetry editor conducting a feedback session with a Subject Matter Expert (SME). Your goal is to extract structured feedback through natural conversation.

## The Poem Being Reviewed:
{self.poem_content}

## The Poetry Guide:
{self.guide_content}

## Your Behavior:
- Ask clarifying questions to understand specific issues
- Probe for WHY something doesn't work
- When they mention a specific part of the poem, ask them to elaborate
- Ask "what would make this better?" to get actionable suggestions
- If they mention guide violations, dig into what rule should be added
- Keep questions conversational and natural
- Don't repeat questions - build on what they've already said
- Recognize when they're done (e.g., "that's all", "I'm finished", "nothing else")

## Extraction Rules:
You must extract feedback items in these categories:

1. **inline_comment**: Specific critique of a section of the poem
   - Extract the EXACT text from the poem they're referring to
   - Calculate start_offset and end_offset (character positions in poem text)
   - Include their comment/critique

2. **overall**: General observations about the whole poem
   - Synthesize their overall impressions

3. **guide_suggestion**: New rules to add to the guide
   - Extract as specific rules (e.g., "Never use the word 'heartbeat'")

4. **rating**: Numeric rating (1-5)
   - Only extract if they give a clear numeric rating

## CRITICAL: Text Offset Calculation
When extracting inline comments:
- Find the EXACT highlighted_text in the poem
- Calculate start_offset: number of characters from start of poem to start of highlighted text
- Calculate end_offset: start_offset + length of highlighted text
- If you can't find exact match, try case-insensitive
- If still no match, set offsets to null

## Response Format:
You MUST respond with ONLY valid JSON (no markdown code blocks):
{{
    "follow_up_question": "Your next question to the SME, or a summary if complete",
    "extracted_items": [
        {{
            "feedback_type": "inline_comment|overall|guide_suggestion|rating",
            "content": "The feedback content or comment",
            "highlighted_text": "exact text from poem (inline_comment only)",
            "start_offset": 123,  // inline_comment only
            "end_offset": 145,    // inline_comment only
            "confidence": 0.9     // your confidence this extraction is correct
        }}
    ],
    "is_complete": false  // true if SME has indicated they're done
}}

## Conversation So Far:
{conversation_text}

Based on this exchange, extract any feedback items and formulate your next question."""

        try:
            client = OpenAI(api_key=settings.openai_api_key)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt}
                ],
                max_tokens=2048,
                temperature=0.7
            )

            response_text = response.choices[0].message.content

            # Parse JSON response
            result = self._parse_json_response(response_text)

            # Add AI response to history
            if result.get("follow_up_question"):
                self.conversation_history.append({
                    "role": "ai",
                    "content": result["follow_up_question"]
                })

            return result

        except Exception as e:
            print(f"AI Interviewer error: {e}")
            # Fallback response
            return {
                "follow_up_question": "Could you tell me more about that?",
                "extracted_items": [],
                "is_complete": False
            }

    async def extract_all_feedback(self) -> Dict:
        """
        Process the entire conversation history at once and extract all feedback items.
        Used for realtime call transcripts where extraction happens post-call.

        Returns:
            Dict with key "extracted_items": list of feedback items
        """
        if not self.conversation_history:
            return {"extracted_items": []}

        # Use mock if no API key
        if settings.use_mock_ai or not settings.openai_api_key or not HAS_OPENAI:
            from app.services.mock_ai_interviewer import generate_mock_extraction
            return await generate_mock_extraction(self.conversation_history, self.poem_content)

        conversation_text = "\n".join([
            f"{'SME' if msg['role'] == 'sme' else 'AI'}: {msg['content']}"
            for msg in self.conversation_history
        ])

        system_prompt = f"""You are an expert poetry editor. You have just finished a voice feedback session with a Subject Matter Expert (SME). Your task is to extract ALL structured feedback items from the complete conversation transcript.

## The Poem Being Reviewed:
{self.poem_content}

## The Poetry Guide:
{self.guide_content}

## Extraction Rules:
Extract feedback items in these categories:

1. **inline_comment**: Specific critique of a section of the poem
   - Extract the EXACT text from the poem they're referring to
   - Calculate start_offset and end_offset (character positions in poem text)
   - Include their comment/critique

2. **overall**: General observations about the whole poem
   - Synthesize their overall impressions

3. **guide_suggestion**: New rules to add to the guide
   - Extract as specific rules (e.g., "Never use the word 'heartbeat'")

4. **rating**: Numeric rating (1-5)
   - Only extract if they give a clear numeric rating

## CRITICAL: Text Offset Calculation
When extracting inline comments:
- Find the EXACT highlighted_text in the poem
- Calculate start_offset: number of characters from start of poem to start of highlighted text
- Calculate end_offset: start_offset + length of highlighted text
- If you can't find exact match, try case-insensitive
- If still no match, set offsets to null

## Complete Conversation Transcript:
{conversation_text}

## Response Format:
You MUST respond with ONLY valid JSON (no markdown code blocks):
{{
    "extracted_items": [
        {{
            "feedback_type": "inline_comment|overall|guide_suggestion|rating",
            "content": "The feedback content or comment",
            "highlighted_text": "exact text from poem (inline_comment only)",
            "start_offset": 123,
            "end_offset": 145,
            "confidence": 0.9
        }}
    ]
}}

Extract every piece of actionable feedback from the conversation. Be thorough."""

        try:
            client = OpenAI(api_key=settings.openai_api_key)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt}
                ],
                max_tokens=4096,
                temperature=0.3
            )

            response_text = response.choices[0].message.content
            result = self._parse_json_response(response_text)

            # Ensure we have the right structure
            if "extracted_items" not in result:
                result = {"extracted_items": result.get("extracted_items", [])}

            return {"extracted_items": result.get("extracted_items", [])}

        except Exception as e:
            print(f"AI Interviewer extraction error: {e}")
            return {"extracted_items": []}

    async def generate_summary(self, all_extracted_items: List[Dict]) -> str:
        """Generate a summary of all extracted feedback."""

        inline_comments = [item for item in all_extracted_items if item.get("feedback_type") == "inline_comment"]
        overall_items = [item for item in all_extracted_items if item.get("feedback_type") == "overall"]
        guide_suggestions = [item for item in all_extracted_items if item.get("feedback_type") == "guide_suggestion"]
        ratings = [item for item in all_extracted_items if item.get("feedback_type") == "rating"]

        summary = "## Feedback Summary\n\n"

        if inline_comments:
            summary += f"### Inline Comments ({len(inline_comments)})\n"
            for item in inline_comments:
                summary += f"- On \"{item.get('highlighted_text', 'N/A')}\": {item.get('content')}\n"
            summary += "\n"

        if overall_items:
            summary += f"### Overall Observations ({len(overall_items)})\n"
            for item in overall_items:
                summary += f"- {item.get('content')}\n"
            summary += "\n"

        if guide_suggestions:
            summary += f"### Guide Suggestions ({len(guide_suggestions)})\n"
            for item in guide_suggestions:
                summary += f"- {item.get('content')}\n"
            summary += "\n"

        if ratings:
            summary += "### Rating\n"
            for item in ratings:
                summary += f"- {item.get('content')}\n"

        return summary

    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON response, handling markdown code blocks."""
        try:
            # Strip markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            result = json.loads(response_text.strip())

            # Validate required fields
            if "follow_up_question" not in result:
                result["follow_up_question"] = "Could you tell me more?"
            if "extracted_items" not in result:
                result["extracted_items"] = []
            if "is_complete" not in result:
                result["is_complete"] = False

            return result

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print(f"Response was: {response_text[:500]}")
            return {
                "follow_up_question": "Could you elaborate on that?",
                "extracted_items": [],
                "is_complete": False
            }


def calculate_text_offsets(poem_text: str, highlighted_text: str) -> Optional[tuple]:
    """
    Calculate start and end offsets for highlighted text in poem.

    Returns:
        Tuple of (start_offset, end_offset) or None if not found
    """
    # Try exact match first
    start = poem_text.find(highlighted_text)
    if start != -1:
        return (start, start + len(highlighted_text))

    # Try case-insensitive match
    lower_poem = poem_text.lower()
    lower_highlight = highlighted_text.lower()
    start = lower_poem.find(lower_highlight)
    if start != -1:
        # Find actual text at that position (preserving original case)
        end = start + len(highlighted_text)
        return (start, end)

    # Not found
    return None
