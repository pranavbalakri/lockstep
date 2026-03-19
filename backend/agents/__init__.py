import json
import anthropic
from config import ANTHROPIC_API_KEY, MODEL, MAX_TOKENS, TEMPERATURE

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


async def call_agent(system_prompt: str, user_message: str, output_model):
    """
    Calls Claude with the given prompts, parses the response as JSON,
    validates it against the Pydantic output_model, and returns the parsed object.
    Retries once on JSON parse failure.
    """
    for attempt in range(2):
        msg = user_message
        if attempt == 1:
            msg += "\n\nYour previous response was not valid JSON. Respond with ONLY valid JSON matching the required schema. No markdown fences, no preamble, no explanation."

        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": msg}]
        )

        raw_text = response.content[0].text.strip()

        # Strip markdown fences if the model wraps them anyway
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

        try:
            parsed = json.loads(raw_text)
            return output_model.model_validate(parsed)
        except (json.JSONDecodeError, Exception) as e:
            if attempt == 0:
                continue
            raise ValueError(
                f"Agent failed to return valid JSON after 2 attempts. Last response: {raw_text[:500]}"
            ) from e


async def call_agent_multimodal(system_prompt: str, content_blocks: list, output_model):
    """
    Calls Claude with multimodal content (text + images), parses the response as JSON,
    validates it against the Pydantic output_model, and returns the parsed object.
    Retries once on JSON parse failure.

    content_blocks should be a list of content blocks, e.g.:
    [
        {"type": "text", "text": "..."},
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "..."}}
    ]
    """
    for attempt in range(2):
        blocks = content_blocks.copy()
        if attempt == 1:
            blocks.append({
                "type": "text",
                "text": "\n\nYour previous response was not valid JSON. Respond with ONLY valid JSON matching the required schema. No markdown fences, no preamble, no explanation."
            })

        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": blocks}]
        )

        raw_text = response.content[0].text.strip()

        # Strip markdown fences if the model wraps them anyway
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

        try:
            parsed = json.loads(raw_text)
            return output_model.model_validate(parsed)
        except (json.JSONDecodeError, Exception) as e:
            if attempt == 0:
                continue
            raise ValueError(
                f"Agent failed to return valid JSON after 2 attempts. Last response: {raw_text[:500]}"
            ) from e
