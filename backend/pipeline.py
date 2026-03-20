from __future__ import annotations
import logging
from models import (
    ScopeParserOutput, AnalyzerOutput, VerdictOutput, MediatorOutput,
    Criterion, CriterionResult, DeliverablesValidationOutput, FileInfo
)
from agents.scope_parser import parse_scope
from agents.deliverable_analyzer import analyze_deliverable
from agents.verdict_agent import render_verdict
from agents.mediator import mediate_dispute
from agents.deliverables_validator import validate_deliverables

logger = logging.getLogger(__name__)


def validate_verdict_output(verdict: VerdictOutput, evaluations: list[CriterionResult]) -> None:
    """Validate verdict output for consistency and potential injection artifacts."""
    # Check that counts match actual evaluations
    actual_passed = sum(1 for e in evaluations if e.result == "PASS")
    actual_failed = sum(1 for e in evaluations if e.result == "FAIL")

    if verdict.passed != actual_passed or verdict.failed != actual_failed:
        logger.warning(
            f"Verdict count mismatch: reported {verdict.passed}/{verdict.failed}, "
            f"actual {actual_passed}/{actual_failed} - possible injection attempt"
        )
        # Correct the counts
        verdict.passed = actual_passed
        verdict.failed = actual_failed
        verdict.total = actual_passed + actual_failed

    # Validate verdict logic consistency
    if actual_failed > 0 and verdict.verdict == "PASS":
        logger.warning("Verdict says PASS but there are failed criteria - correcting")
        verdict.verdict = "FAIL"
    elif actual_failed == 0 and verdict.verdict == "FAIL":
        logger.warning("Verdict says FAIL but all criteria passed - correcting")
        verdict.verdict = "PASS"


def validate_mediator_output(result: MediatorOutput) -> None:
    """Validate mediator output for suspicious patterns that may indicate injection."""
    split = result.proposed_split

    # Check percentages sum to 100
    if split.freelancer_percentage + split.client_refund_percentage != 100:
        logger.warning(
            f"Invalid split: {split.freelancer_percentage}% + {split.client_refund_percentage}% != 100 "
            "- possible injection attempt"
        )
        raise ValueError("Mediator returned invalid split percentages")

    # Check for extreme values (rules say never 0% or 100%)
    if split.freelancer_percentage == 100 or split.freelancer_percentage == 0:
        logger.warning(
            f"Extreme split detected: {split.freelancer_percentage}% to freelancer "
            "- possible injection attempt, clamping to valid range"
        )
        # Clamp to valid range
        if split.freelancer_percentage == 100:
            split.freelancer_percentage = 95
            split.client_refund_percentage = 5
        else:
            split.freelancer_percentage = 5
            split.client_refund_percentage = 95

    # Check for reasonable bounds
    if split.freelancer_percentage < 0 or split.freelancer_percentage > 100:
        logger.warning(f"Out of bounds split: {split.freelancer_percentage}%")
        raise ValueError("Mediator returned out-of-bounds split percentage")


async def run_deliverables_validation(description: str, deliverables: str, work_type: str) -> DeliverablesValidationOutput:
    return await validate_deliverables(description, deliverables, work_type)


async def run_scope_parsing(description: str, work_type: str) -> ScopeParserOutput:
    return await parse_scope(description, work_type)


async def run_evaluation(
    deliverable_text: str,
    deliverable_url: str | None,
    criteria: list[Criterion],
    work_type: str,
    files: list[FileInfo] | None = None
) -> tuple[AnalyzerOutput, VerdictOutput]:
    analyzer_output = await analyze_deliverable(deliverable_text, deliverable_url, criteria, work_type, files)
    verdict = await render_verdict(analyzer_output.evaluations)

    # Validate and potentially correct the verdict
    validate_verdict_output(verdict, analyzer_output.evaluations)

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
    result = await mediate_dispute(
        description, criteria, deliverable_text,
        evaluations, verdict, client_argument, freelancer_argument
    )

    # Validate and potentially correct the mediator output
    validate_mediator_output(result)

    return result
