"""Mock AI Interviewer for testing without OpenAI API key."""

from typing import List, Dict


async def generate_mock_response(
    sme_message: str,
    conversation_history: List[Dict[str, str]],
    poem_content: str
) -> Dict:
    """
    Generate deterministic mock responses based on conversation turn.

    Args:
        sme_message: Latest message from SME
        conversation_history: Full conversation history
        poem_content: The poem being reviewed

    Returns:
        Dict with follow_up_question, extracted_items, is_complete
    """

    # Count SME messages to determine turn number
    sme_messages = [msg for msg in conversation_history if msg["role"] == "sme"]
    turn = len(sme_messages)

    # Check for completion signals
    completion_signals = [
        "that's all", "i'm done", "nothing else", "that's it",
        "all done", "finished", "no more", "that's everything"
    ]
    message_lower = sme_message.lower()
    is_complete = any(signal in message_lower for signal in completion_signals)

    # Turn 0: First message - extract initial patterns and ask for specifics
    if turn == 1:
        # Extract some mock feedback based on keywords in message
        extracted_items = []

        # Look for inline comment indicators
        if any(word in message_lower for word in ["line", "phrase", "word", "part", "section"]):
            # Get first line of poem as mock highlight
            first_line = poem_content.split('\n')[0] if poem_content else "sample text"
            extracted_items.append({
                "feedback_type": "inline_comment",
                "content": f"[Mock] SME mentioned: {sme_message[:50]}...",
                "highlighted_text": first_line,
                "start_offset": 0,
                "end_offset": len(first_line),
                "confidence": 0.7
            })

        # Look for overall feedback
        if any(word in message_lower for word in ["overall", "general", "whole", "entire"]):
            extracted_items.append({
                "feedback_type": "overall",
                "content": f"[Mock] Overall observation: {sme_message[:100]}",
                "confidence": 0.8
            })

        return {
            "follow_up_question": "That's helpful! Can you tell me more specifically which parts of the poem stood out to you? Are there specific words or phrases that don't work?",
            "extracted_items": extracted_items,
            "is_complete": False
        }

    # Turn 1: Second message - probe for guide rules
    elif turn == 2:
        extracted_items = []

        # Extract more inline comments
        if "line" in message_lower or "word" in message_lower:
            lines = poem_content.split('\n')
            if len(lines) > 1:
                second_line = lines[1]
                offset = len(lines[0]) + 1  # +1 for newline
                extracted_items.append({
                    "feedback_type": "inline_comment",
                    "content": f"[Mock] Issue with this section: {sme_message[:50]}",
                    "highlighted_text": second_line,
                    "start_offset": offset,
                    "end_offset": offset + len(second_line),
                    "confidence": 0.75
                })

        # Look for guide suggestions
        if any(word in message_lower for word in ["never", "don't", "avoid", "rule", "should"]):
            extracted_items.append({
                "feedback_type": "guide_suggestion",
                "content": f"[Mock] Suggested rule based on feedback: {sme_message[:80]}",
                "confidence": 0.8
            })

        return {
            "follow_up_question": "Good points. Based on what you're seeing, are there any rules you think should be added to the poetry guide to prevent similar issues in the future?",
            "extracted_items": extracted_items,
            "is_complete": False
        }

    # Turn 2+: Check for completion or continue conversation
    else:
        extracted_items = []

        # Extract rating if mentioned
        if any(str(i) in sme_message for i in range(1, 6)):
            for i in range(1, 6):
                if str(i) in sme_message:
                    extracted_items.append({
                        "feedback_type": "rating",
                        "content": f"Rating: {i}/5",
                        "confidence": 0.9
                    })
                    break

        if is_complete:
            return {
                "follow_up_question": "Thank you for your feedback! I've captured everything you mentioned. You can now review the summary and confirm which items to include.",
                "extracted_items": extracted_items,
                "is_complete": True
            }
        else:
            # Continue probing
            questions = [
                "Is there anything else about this poem that concerns you?",
                "How would you rate this poem overall on a scale of 1-5?",
                "Any other thoughts or suggestions?",
                "What would you say is the main thing that needs improvement?"
            ]
            question = questions[min(turn - 3, len(questions) - 1)]

            return {
                "follow_up_question": question,
                "extracted_items": extracted_items,
                "is_complete": False
            }
