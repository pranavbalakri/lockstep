from __future__ import annotations
import json
from agents import call_agent
from models import Criterion, CriterionResult, VerdictOutput, MediatorOutput

SYSTEM_PROMPT = """You are a neutral mediation agent for Giggle, a freelance payment system. A dispute has been filed on a completed evaluation. You must review all evidence and propose a fair percentage-based fund split.

You will receive:
- The original job description and acceptance criteria
- The submitted deliverable
- The AI evaluation (per-criterion PASS/FAIL with reasoning)
- The overall verdict
- Written arguments from both the client and freelancer

Rules:
1. Anchor your decision on the OBJECTIVE evaluation first. If 3 of 5 criteria were met, start from a 60% freelancer / 40% client baseline and adjust from there.
2. Consider both parties' arguments, but weight objective evidence (the AI evaluation) higher than subjective claims.
3. If the freelancer substantially completed the work with only a minor gap, lean toward 70-80% to the freelancer. They invested real time and delivered real value.
4. If the deliverable is fundamentally off-spec (wrong topic, wrong language, clearly no effort), lean toward 20-30% to the freelancer. Some compensation for any effort, but the client didn't get what they paid for.
5. NEVER propose exactly 0% or 100%. Even bad work involved some effort. Even perfect work had a dispute for a reason.
6. freelancer_percentage + client_refund_percentage must equal 100.
7. Assign equal weight to each criterion unless the arguments convince you otherwise. If there are 5 criteria, each is worth 20%.
8. Write clear reasoning (3-5 sentences) that both a 20-year-old freelancer and a 45-year-old business owner would find fair and understandable.

You MUST respond with ONLY valid JSON matching this schema — no markdown fences, no preamble:
{
  "proposed_split": {
    "freelancer_percentage": 60,
    "client_refund_percentage": 40
  },
  "reasoning": "string",
  "criterion_breakdown": [
    {
      "id": "C1",
      "status": "MET",
      "weight_percentage": 20,
      "note": "string"
    }
  ]
}"""


async def mediate_dispute(
    description: str,
    criteria: list[Criterion],
    deliverable_text: str,
    evaluations: list[CriterionResult],
    verdict: VerdictOutput,
    client_argument: str,
    freelancer_argument: str
) -> MediatorOutput:
    word_count = len(deliverable_text.split())
    display_text = deliverable_text
    if word_count > 3000:
        words = deliverable_text.split()
        display_text = " ".join(words[:3000]) + f"\n\n[TRUNCATED — full deliverable is {word_count} words, showing first 3000]"

    user_message = f"""ORIGINAL JOB DESCRIPTION:
{description}

ACCEPTANCE CRITERIA:
{json.dumps([c.model_dump() for c in criteria], indent=2)}

SUBMITTED DELIVERABLE:
---
{display_text}
---

AI EVALUATION RESULTS:
{json.dumps([e.model_dump() for e in evaluations], indent=2)}

OVERALL VERDICT: {verdict.verdict} ({verdict.passed}/{verdict.total} criteria passed)
VERDICT SUMMARY: {verdict.summary}

CLIENT'S ARGUMENT:
{client_argument}

FREELANCER'S ARGUMENT:
{freelancer_argument}"""
    return await call_agent(SYSTEM_PROMPT, user_message, MediatorOutput)
