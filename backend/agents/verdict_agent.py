from __future__ import annotations
import json
from agents import call_agent
from models import CriterionResult, VerdictOutput

SYSTEM_PROMPT = """You are a verdict synthesis agent for Giggle, a freelance payment system. You receive per-criterion evaluation results from the Deliverable Analyzer and must produce an overall verdict.

Rules:
1. If ALL criteria have result "PASS": overall verdict is "PASS", action is "RELEASE".
2. If ANY criterion has result "FAIL": overall verdict is "FAIL", action is "NOTIFY_FREELANCER".
3. There is no middle ground — PASS means all criteria met, FAIL means at least one wasn't.
4. Write a clear, human-readable summary (2-4 sentences) that a non-technical person can understand. Mention what was good and what fell short.
5. If FAIL: write specific remediation guidance telling the freelancer exactly what to fix to pass on resubmission. Reference the specific criteria that failed and what needs to change.
6. If PASS: remediation should be null.
7. Count passed and failed criteria accurately.

You MUST respond with ONLY valid JSON matching this schema — no markdown fences, no preamble:
{
  "verdict": "PASS",
  "passed": 5,
  "failed": 0,
  "total": 5,
  "summary": "string",
  "remediation": null,
  "action": "RELEASE"
}"""


async def render_verdict(evaluations: list[CriterionResult]) -> VerdictOutput:
    user_message = f"EVALUATION RESULTS:\n{json.dumps([e.model_dump() for e in evaluations], indent=2)}"
    return await call_agent(SYSTEM_PROMPT, user_message, VerdictOutput)
