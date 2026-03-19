from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from models import (
    ScopeParserOutput, Criterion, CriterionResult,
    VerdictOutput, MediatorOutput, AnalyzerOutput, DeliverablesValidationOutput, FileInfo
)
from pipeline import run_scope_parsing, run_evaluation, run_mediation, run_deliverables_validation
import config

router = APIRouter()


class ValidateDeliverablesRequest(BaseModel):
    description: str
    deliverables: str
    work_type: str


class ParseScopeRequest(BaseModel):
    description: str
    work_type: str


class EvaluateRequest(BaseModel):
    deliverable_text: str
    deliverable_url: Optional[str] = None
    criteria: list[Criterion]
    work_type: str
    files: list[FileInfo] = []


class EvaluateResponse(BaseModel):
    evaluations: list[CriterionResult]
    verdict: VerdictOutput


class MediateRequest(BaseModel):
    description: str
    criteria: list[Criterion]
    deliverable_text: str
    evaluations: list[CriterionResult]
    verdict: VerdictOutput
    client_argument: str
    freelancer_argument: str


@router.post("/validate-deliverables", response_model=DeliverablesValidationOutput)
async def validate_deliverables_endpoint(req: ValidateDeliverablesRequest):
    try:
        return await run_deliverables_validation(req.description, req.deliverables, req.work_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-scope", response_model=ScopeParserOutput)
async def parse_scope_endpoint(req: ParseScopeRequest):
    try:
        return await run_scope_parsing(req.description, req.work_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_endpoint(req: EvaluateRequest):
    try:
        analyzer_output, verdict = await run_evaluation(
            req.deliverable_text, req.deliverable_url, req.criteria, req.work_type, req.files
        )
        return EvaluateResponse(evaluations=analyzer_output.evaluations, verdict=verdict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mediate", response_model=MediatorOutput)
async def mediate_endpoint(req: MediateRequest):
    try:
        return await run_mediation(
            req.description, req.criteria, req.deliverable_text,
            req.evaluations, req.verdict, req.client_argument, req.freelancer_argument
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {"status": "ok", "model": config.MODEL}
