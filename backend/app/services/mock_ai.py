"""Mock AI service for development without API keys."""

import random
import re


def generate_mock_poem(prompt: str, guide: str) -> str:
    """Generate a mock poem based on the prompt and guide."""

    # Extract subject from prompt - get the core noun
    words = prompt.lower()
    for prefix in ["write a poem about ", "a poem about ", "write about ", "poem about ", "write me a poem about "]:
        words = words.replace(prefix, "")
    words = words.strip()
    # Take first meaningful noun (skip articles, prepositions)
    tokens = words.split()
    skip_words = {'a', 'an', 'the', 'in', 'on', 'at', 'by', 'with', 'of', 'to', 'for', 'and'}
    subject = next((t for t in tokens if t not in skip_words), "moment")

    # Check guide for forbidden words
    guide_lower = guide.lower()
    forbidden_words = set()

    # Extract forbidden words from guide
    for line in guide_lower.split('\n'):
        if 'never use' in line or 'avoid' in line or 'don\'t use' in line or 'forbidden' in line:
            # Extract quoted words or words after "word" or "words"
            quoted = re.findall(r'"([^"]+)"', line)
            forbidden_words.update(quoted)
            # Also check for "the word X" pattern
            word_match = re.findall(r'(?:word|words?)\s+["\']?(\w+)["\']?', line)
            forbidden_words.update(word_match)

    # Subject-specific sensory details
    sensory_map = {
        'dog': ('warm fur, soft ears', 'wet nose against glass'),
        'cat': ('sleek fur, green eyes', 'paw pressed to window'),
        'bird': ('ruffled feathers, sharp beak', 'claws gripping tight'),
        'tree': ('rough bark, reaching limbs', 'roots deep in dark soil'),
        'rain': ('cold drops, gray sky', 'water pooling on stone'),
        'window': ('cold glass, fogged breath', 'light streaming through'),
        'child': ('small hands, bright eyes', 'laughter in the hall'),
    }
    default_sensory = ('sharp edges, soft light', 'shadow on the wall')
    sensory = sensory_map.get(subject, default_sensory)

    # Check for style preferences in guide
    use_active = "active verb" in guide_lower or "dynamic" in guide_lower

    if use_active:
        templates = [
            """Morning light strikes
the {subject}—alert, alive—
breath caught, then released.

Each gesture pulses
through the space between moments,
urgent, necessary.""",

            """The {subject} watches,
remembers what we forgot:
how to wait, coiled,
how to let silence
sharpen into meaning.

{sensory1}
claiming the margins
of our hurried days.""",

            """See how the {subject}
grips its moment—
not burden
but fierce belonging.

{sensory1}
etched in the grammar
of presence.""",
        ]
    else:
        templates = [
            """Morning light spills
across the {subject}'s quiet form—
a breath held, released.

Each small gesture unfolds
in the space between moments,
ordinary, sacred.""",

            """The {subject} knows
what we've forgotten:
how to be still,
how to let silence
speak its own language.

This quiet presence
waits in the margins
of our hurried days.""",

            """Watch how the {subject}
carries its weight—
not as burden
but as belonging.

Every moment
written in the grammar
of presence.""",
        ]

    poem = random.choice(templates).format(subject=subject, sensory1=sensory[0], sensory2=sensory[1])

    # Apply guide principles if present
    if "emotional arc" in guide_lower:
        lines = poem.split('\n')
        if len(lines) > 4 and "shift" not in poem:
            lines.insert(len(lines)//2, "\nAnd then—a shift,")
            poem = '\n'.join(lines)

    if ("concrete" in guide_lower or "sensory" in guide_lower or "physical" in guide_lower):
        poem = poem.replace("quiet form", sensory[0])
        poem = poem.replace("quiet presence", sensory[1])

    # Remove any forbidden words
    for forbidden in forbidden_words:
        if forbidden in poem.lower():
            # Replace with alternative
            alternatives = {
                'heartbeats': 'moments',
                'heartbeat': 'moment',
                'heart': 'chest',
                'soul': 'self',
                'beautiful': 'striking',
                'love': 'longing',
                'silence': 'stillness',
                'sacred': 'rare',
            }
            replacement = alternatives.get(forbidden, '...')
            poem = re.sub(re.escape(forbidden), replacement, poem, flags=re.IGNORECASE)

    return poem


def extract_forbidden_words(text: str) -> list[str]:
    """Extract words that feedback says to never use/remove/avoid."""
    text_lower = text.lower()
    forbidden = []

    # Pattern: "never use X", "remove X", "don't use X", "avoid X", "delete X"
    patterns = [
        r"never use (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"don'?t use (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"remove (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"delete (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"avoid (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"get rid of (?:the )?(?:word )?['\"]?(\w+)['\"]?",
        r"(?:word |phrase )['\"]?(\w+)['\"]? (?:is |should be |needs to be )?(?:removed|deleted|avoided|forbidden)",
        r"['\"](\w+)['\"]? (?:is |should be )?(?:too |overused|cliche|forbidden|banned)",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        forbidden.extend(matches)

    # Also check if the highlighted text itself is what they want removed
    # (when comment says things like "remove this" or "delete")

    return list(set(forbidden))


def find_replacement(word: str) -> str:
    """Find a replacement for a forbidden word."""
    replacements = {
        'heartbeats': 'breaths',
        'heartbeat': 'breath',
        'heart': 'chest',
        'hearts': 'chests',
        'moments': 'breaths',
        'moment': 'breath',
        'soul': 'self',
        'souls': 'selves',
        'beautiful': 'striking',
        'beauty': 'grace',
        'love': 'longing',
        'loved': 'held dear',
        'silence': 'stillness',
        'silent': 'still',
        'sacred': 'rare',
        'ordinary': 'common',
        'eternal': 'lasting',
        'eternity': 'long years',
        'forever': 'always',
        'dream': 'vision',
        'dreams': 'visions',
        'magical': 'strange',
        'magic': 'wonder',
        'perfect': 'whole',
        'perfection': 'wholeness',
        'infinite': 'vast',
        'infinity': 'vastness',
        'destiny': 'path',
        'fate': 'chance',
        'tears': 'salt water',
        'tear': 'drop',
        'cry': 'weep',
        'crying': 'weeping',
        'quiet': 'still',
        'soft': 'gentle',
        'dark': 'dim',
        'light': 'glow',
        'time': 'hours',
        'space': 'distance',
    }
    # Return replacement or the word itself removed (empty)
    return replacements.get(word.lower(), '')


def generate_mock_revision(
    original_poem: str,
    feedback: str,
    comments: list[dict],
    guide: str
) -> dict:
    """Generate a revision that actually addresses the SME feedback."""

    revised_poem = original_poem
    guide_additions = []
    applied_changes = []
    forbidden_words = []

    # FIRST: Extract any words to remove/avoid from ALL feedback
    all_feedback_text = feedback or ""
    for comment in comments:
        all_feedback_text += " " + comment.get('comment', '')
        all_feedback_text += " " + comment.get('highlighted_text', '')

    # Find words explicitly marked for removal
    forbidden_words = extract_forbidden_words(all_feedback_text)

    # Process each inline comment
    for comment in comments:
        highlighted = comment.get('highlighted_text', '')
        feedback_text = comment.get('comment', '').lower()

        if not highlighted:
            continue

        # Check if this comment is about removing/avoiding a word
        comment_forbidden = extract_forbidden_words(feedback_text)

        if comment_forbidden:
            # Remove these words from the poem
            for word in comment_forbidden:
                if word.lower() in revised_poem.lower():
                    replacement = find_replacement(word)
                    # Case-insensitive replacement
                    pattern = re.compile(re.escape(word), re.IGNORECASE)
                    revised_poem = pattern.sub(replacement, revised_poem)
                    applied_changes.append(f"Removed '{word}' → replaced with '{replacement}'")
                    guide_additions.append(f"- Never use the word \"{word}\"")

        # Check if the highlighted text itself contains a word they want gone
        elif any(phrase in feedback_text for phrase in ['remove', 'delete', 'get rid', 'take out', 'cut']):
            # They want to remove the highlighted text or a word in it
            words_in_highlight = highlighted.split()
            if len(words_in_highlight) <= 3:
                # Remove the whole phrase
                # Find what line it's on and rewrite that line without it
                for word in words_in_highlight:
                    if len(word) > 3:  # Skip small words
                        replacement = find_replacement(word)
                        pattern = re.compile(re.escape(word), re.IGNORECASE)
                        revised_poem = pattern.sub(replacement, revised_poem)
                        applied_changes.append(f"Removed '{word}' → '{replacement}'")
                        guide_additions.append(f"- Avoid the word \"{word}\"")
            else:
                # Shorten or rewrite the highlighted section
                shortened = ' '.join(words_in_highlight[:2]) + '—'
                revised_poem = revised_poem.replace(highlighted, shortened)
                applied_changes.append(f"Shortened '{highlighted}'")

        # Check for "change X to Y" or "replace X with Y" patterns
        elif 'change' in feedback_text or 'replace' in feedback_text:
            # Try to extract what to change to
            match = re.search(r'(?:change|replace).*?(?:to|with)\s+["\']?(\w+(?:\s+\w+)?)["\']?', feedback_text)
            if match:
                new_text = match.group(1)
                revised_poem = revised_poem.replace(highlighted, new_text)
                applied_changes.append(f"Changed '{highlighted}' → '{new_text}'")
            else:
                # Generic replacement
                replacement = find_replacement(highlighted.split()[0]) if highlighted.split() else "..."
                revised_poem = revised_poem.replace(highlighted, replacement)
                applied_changes.append(f"Replaced '{highlighted}'")

        # Check for requests for more energy/active language
        elif any(word in feedback_text for word in ['active', 'energy', 'dynamic', 'movement', 'stronger']):
            replacements = {
                'quiet': 'intent',
                'still': 'poised',
                'waits': 'watches',
                'spills': 'strikes',
                'unfolds': 'pulses',
                'soft': 'keen',
                'small': 'sharp',
            }
            made_change = False
            for old, new in replacements.items():
                if old in highlighted.lower():
                    pattern = re.compile(re.escape(old), re.IGNORECASE)
                    new_highlighted = pattern.sub(new, highlighted)
                    revised_poem = revised_poem.replace(highlighted, new_highlighted)
                    applied_changes.append(f"Made '{highlighted}' more active → '{new_highlighted}'")
                    made_change = True
                    break
            if not made_change:
                revised_poem = revised_poem.replace(highlighted, f"{highlighted}, alive")
                applied_changes.append(f"Added energy to '{highlighted}'")
            guide_additions.append("- Use active verbs and dynamic imagery")

        # Check for requests for more concrete/specific language
        elif any(word in feedback_text for word in ['concrete', 'specific', 'detail', 'sensory', 'vivid', 'vague']):
            replacements = {
                'form': 'silhouette',
                'presence': 'shadow',
                'moment': 'breath',
                'gesture': 'movement',
            }
            made_change = False
            for old, new in replacements.items():
                if old in highlighted.lower():
                    pattern = re.compile(re.escape(old), re.IGNORECASE)
                    new_highlighted = pattern.sub(new, highlighted)
                    revised_poem = revised_poem.replace(highlighted, new_highlighted)
                    applied_changes.append(f"Made '{highlighted}' more concrete → '{new_highlighted}'")
                    made_change = True
                    break
            if not made_change:
                applied_changes.append(f"Reviewed '{highlighted}' for concreteness")
            guide_additions.append("- Ground abstract ideas in physical, sensory details")

        # Check for cliche feedback
        elif any(word in feedback_text for word in ['cliche', 'overused', 'tired', 'generic', 'trite']):
            # Mark the word as forbidden and replace it
            main_word = highlighted.split()[0] if highlighted.split() else highlighted
            replacement = find_replacement(main_word)
            if replacement != f"[{main_word}]":
                pattern = re.compile(re.escape(main_word), re.IGNORECASE)
                revised_poem = pattern.sub(replacement, revised_poem)
                applied_changes.append(f"Replaced cliche '{main_word}' → '{replacement}'")
            else:
                applied_changes.append(f"Flagged '{highlighted}' as cliche")
            guide_additions.append(f"- Avoid cliched words like \"{main_word}\"")

        else:
            # For any other feedback, try to address it
            applied_changes.append(f"Reviewed '{highlighted}' based on feedback: {comment.get('comment', '')[:50]}")

    # Also remove any forbidden words we found that are still in the poem
    for word in forbidden_words:
        if word.lower() in revised_poem.lower():
            replacement = find_replacement(word)
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            old_poem = revised_poem
            revised_poem = pattern.sub(replacement, revised_poem)
            if revised_poem != old_poem:
                applied_changes.append(f"Removed forbidden word '{word}' → '{replacement}'")
                guide_additions.append(f"- Never use the word \"{word}\"")

    # Process overall feedback for additional instructions
    if feedback:
        feedback_lower = feedback.lower()

        # Check for forbidden words in overall feedback
        overall_forbidden = extract_forbidden_words(feedback)
        for word in overall_forbidden:
            if word.lower() in revised_poem.lower():
                replacement = find_replacement(word)
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                revised_poem = pattern.sub(replacement, revised_poem)
                if f"Removed forbidden word '{word}'" not in str(applied_changes):
                    applied_changes.append(f"Removed '{word}' per overall feedback → '{replacement}'")
                    guide_additions.append(f"- Never use the word \"{word}\"")

        if 'energy' in feedback_lower or 'dynamic' in feedback_lower:
            guide_additions.append("- Build energy through active verbs and punctuation")

        if 'shorter' in feedback_lower or 'concise' in feedback_lower:
            lines = [l for l in revised_poem.split('\n') if l.strip()]
            if len(lines) > 6:
                revised_poem = '\n'.join(lines[:6])
                applied_changes.append("Trimmed poem for conciseness")
            guide_additions.append("- Prefer brevity; cut lines that don't earn their place")

    # Build proposed guide changes
    proposed_guide_changes = None
    if guide_additions:
        unique_additions = list(dict.fromkeys(guide_additions))
        proposed_guide_changes = "## SME Feedback Rules\n" + '\n'.join(unique_additions)

    # Build rationale
    if applied_changes:
        rationale = "Based on SME feedback, the following changes were made:\n" + '\n'.join(f"• {c}" for c in applied_changes)
        if proposed_guide_changes:
            rationale += "\n\nThe proposed guide changes will prevent similar issues in future poems."
    else:
        rationale = "Feedback was reviewed but no direct changes could be applied. The guide updates reflect the SME's preferences."

    return {
        "revised_poem": revised_poem,
        "proposed_guide_changes": proposed_guide_changes,
        "rationale": rationale
    }
