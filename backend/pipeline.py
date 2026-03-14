from __future__ import annotations
from models import (
    ScopeParserOutput, AnalyzerOutput, VerdictOutput, MediatorOutput,
    Criterion, CriterionResult
)
from agents.scope_parser import parse_scope
from agents.deliverable_analyzer import analyze_deliverable
from agents.verdict_agent import render_verdict
from agents.mediator import mediate_dispute


async def run_scope_parsing(description: str, work_type: str) -> ScopeParserOutput:
    return await parse_scope(description, work_type)


async def run_evaluation(
    deliverable_text: str,
    deliverable_url: str | None,
    criteria: list[Criterion],
    work_type: str
) -> tuple[AnalyzerOutput, VerdictOutput]:
    analyzer_output = await analyze_deliverable(deliverable_text, deliverable_url, criteria, work_type)
    verdict = await render_verdict(analyzer_output.evaluations)
    return analyzer_output, verdict


async def run_mediation(
    description: str,
    criteria: list[Criterion],
    deliverable_text: str,
    evaluations: list[CriterionResult],
    verdict: VerdictOutput,
    client_argument: str,
    freelancer_argument: str
) -> MediatorOutput:
    return await mediate_dispute(
        description, criteria, deliverable_text,
        evaluations, verdict, client_argument, freelancer_argument
    )
