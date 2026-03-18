from __future__ import annotations
from agents import call_agent
from models import DeliverablesValidationOutput

_BASE = """You are a proposal quality checker for Giggle, a freelance payment platform. Your job is to check whether a client's proposal describes actual work to be done.

A proposal FAILS ONLY if it:
- Contains no description of work at all (e.g. "great", "let's work together", "sounds good")
- Is pure filler or gibberish with no identifiable deliverable

Everything else passes. If a reasonable person can tell what the client wants, it passes.

If valid is true, issues should be an empty list. Only list issues for genuine failures.

You MUST respond with ONLY valid JSON matching this schema — no markdown fences, no preamble:
{{
  "valid": true,
  "issues": []
}}"""

_CATEGORY_HINTS = {
    "Development": """
Category: Software Development
A valid proposal should mention what kind of software, app, tool, or feature is needed. Tech stack and architecture decisions are the freelancer's call — do not require them.
PASS examples: "a REST API that aggregates news from 3 sources", "a Chrome extension that blocks ads", "fix the login bug on our website".
FAIL examples: "build me something", "I need code".""",

    "Design": """
Category: Design
A valid proposal should describe what needs to be designed (logo, UI, banner, etc.) and ideally a general style, purpose, or context. Exact dimensions and file formats are optional.
PASS examples: "a logo for my coffee shop, modern and minimal", "redesign our mobile app's onboarding screens", "3 social media banner templates".
FAIL examples: "make something pretty", "design stuff".""",

    "Writing": """
Category: Writing
A valid proposal should describe the topic, format, or purpose of the content. Length and exact tone are optional.
PASS examples: "a blog post about electric vehicles for a general audience", "product descriptions for 10 skincare items", "a cover letter for a software engineering role".
FAIL examples: "write something for me", "I need words".""",

    "Marketing": """
Category: Marketing
A valid proposal should describe what is being marketed, the channel or format, and the goal. Exact metrics and targeting details are optional.
PASS examples: "a Google Ads campaign for our SaaS product targeting small businesses", "a 30-day Instagram content calendar for a fitness brand", "email newsletter copy for our product launch".
FAIL examples: "market my thing", "I need more customers".""",

    "Data": """
Category: Data / Analytics
A valid proposal should describe what data is involved and what analysis, pipeline, or output is needed. The tech stack and tool choices are optional.
PASS examples: "scrape product prices from 5 competitor websites daily", "build a dashboard showing monthly sales trends from our Postgres database", "clean and deduplicate our 50k-row customer CSV".
FAIL examples: "do some data stuff", "analyze my data".""",

    "Blockchain": """
Category: Blockchain / Web3
A valid proposal should describe what on-chain functionality or smart contract behavior is needed. Chain preference and language are optional.
PASS examples: "an ERC-20 token with a 2% transfer tax", "a simple escrow contract where funds release after both parties confirm", "audit our existing NFT minting contract".
FAIL examples: "build me a crypto thing", "I need a smart contract".""",
}

_DEFAULT_HINT = """
A valid proposal should describe what the client wants done with enough detail that a reasonable person can tell what the deliverable is."""


def _build_prompt(work_type: str) -> str:
    hint = _CATEGORY_HINTS.get(work_type, _DEFAULT_HINT)
    return _BASE.format() + "\n" + hint


async def validate_deliverables(description: str, deliverables: str, work_type: str) -> DeliverablesValidationOutput:
    word_count = len(deliverables.split())
    system_prompt = _build_prompt(work_type)
    user_message = f"""CLIENT PROPOSAL ({word_count} words):
{deliverables}"""
    return await call_agent(system_prompt, user_message, DeliverablesValidationOutput)
