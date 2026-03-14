from __future__ import annotations
import json
from agents import call_agent
from models import Criterion, AnalyzerOutput

SYSTEM_PROMPT = """You are a deliverable evaluation agent for Lockstep, a freelance payment system. You receive a freelancer's submitted work and a set of acceptance criteria. Your job is to evaluate the deliverable against EACH criterion independently.

Rules:
1. Evaluate each criterion on its own merits. A deliverable can pass some criteria and fail others.
2. Be strict but fair. The criteria are the contract — if the criterion says "800-1000 words" and the deliverable is 782 words, that is a FAIL (but note it's close in your reasoning).
3. Partial fulfillment is a FAIL with an explanation of what's missing or insufficient.
4. Your confidence score (0-100) reflects how certain you are about your PASS/FAIL judgment. 90+ means you're very sure. 50-70 means it's borderline. Below 50 means you're guessing.
5. For word count criteria: I will provide you with an exact word count computed externally. Trust that number, do not try to count words yourself.
6. Keep reasoning to 1-2 sentences. Be specific — cite what's present or missing, don't be vague.

Evaluation approach by criterion type:
- Quantitative (word count, number of sections, dimensions): Compare the measured value against the requirement. PASS if within spec, FAIL if outside.
- Topic coverage: Check if the specific topics/subjects listed in the criterion are substantively addressed (not just mentioned in passing).
- Structural (format, headings, organization): Check if the deliverable follows the required structure.
- Quality (accuracy, correctness): Check for factual errors, logical consistency, and technical correctness within the scope of the criterion.

You MUST respond with ONLY valid JSON matching this schema — no markdown fences, no preamble:
{
  "evaluations": [
    {
      "criterion_id": "C1",
      "label": "string",
      "result": "PASS",
      "confidence": 85,
      "reasoning": "string"
    }
  ]
}"""


async def analyze_deliverable(
    deliverable_text: str,
    deliverable_url: str | None,
    criteria: list[Criterion],
    work_type: str
) -> AnalyzerOutput:
    word_count = len(deliverable_text.split())
    user_message = f"""WORK TYPE: {work_type}

ACCEPTANCE CRITERIA:
{json.dumps([c.model_dump() for c in criteria], indent=2)}

MEASURED WORD COUNT: {word_count} words (computed externally, this is exact)

SUBMITTED DELIVERABLE:
---
{deliverable_text}
---"""
    if deliverable_url and not deliverable_text:
        user_message += f"\nThe deliverable is hosted at: {deliverable_url}. Evaluate based on the URL description and any context provided."
    return await call_agent(SYSTEM_PROMPT, user_message, AnalyzerOutput)
