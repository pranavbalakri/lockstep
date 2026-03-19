from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class FileInfo(BaseModel):
    filename: str
    mimeType: str
    fileType: str  # "image" | "document" | "code" | "other"
    base64: str


class Criterion(BaseModel):
    id: str
    label: str
    description: str
    evaluation_method: str
    measurable: bool


class ScopeWarning(BaseModel):
    original_text: str
    issue: str
    suggestion: str


class ScopeParserOutput(BaseModel):
    criteria: list[Criterion]
    warnings: list[ScopeWarning]
    revision_limit: int


class CriterionResult(BaseModel):
    criterion_id: str
    label: str
    result: str  # "PASS" or "FAIL"
    confidence: int
    reasoning: str


class AnalyzerOutput(BaseModel):
    evaluations: list[CriterionResult]


class VerdictAction(str, Enum):
    RELEASE = "RELEASE"
    NOTIFY_FREELANCER = "NOTIFY_FREELANCER"


class VerdictOutput(BaseModel):
    verdict: str
    passed: int
    failed: int
    total: int
    summary: str
    remediation: Optional[str]
    action: VerdictAction


class DeliverablesValidationOutput(BaseModel):
    valid: bool
    issues: list[str]


class ProposedSplit(BaseModel):
    freelancer_percentage: int
    client_refund_percentage: int


class CriterionBreakdown(BaseModel):
    id: str
    status: str  # "MET", "PARTIALLY_MET", "NOT_MET"
    weight_percentage: int
    note: str


class MediatorOutput(BaseModel):
    proposed_split: ProposedSplit
    reasoning: str
    criterion_breakdown: list[CriterionBreakdown]
