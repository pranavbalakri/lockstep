const AI_BACKEND = process.env.AI_BACKEND_URL ?? "http://localhost:8000"

interface AiReviewGigInput {
  description: string
  deliverables: string
  category: string
}

interface FileInput {
  filename: string
  mimeType: string
  fileType: string
  base64: string
}

interface AiReviewSubmissionInput {
  textContent?: string | null
  url?: string | null
  files?: FileInput[]
}

interface Criterion {
  id: string
  label: string
  description: string
  evaluation_method: string
  measurable: boolean
}

interface CriterionResult {
  criterion_id: string
  label: string
  result: "PASS" | "FAIL"
  confidence: number
  reasoning: string
}

interface Verdict {
  verdict: "PASS" | "FAIL"
  passed: number
  failed: number
  total: number
  summary: string
  remediation: string | null
  action: "RELEASE" | "NOTIFY_FREELANCER"
}

export interface AiReviewResult {
  criteria: Criterion[]
  evaluations: CriterionResult[]
  verdict: Verdict
}

export async function runAiReview(
  gig: AiReviewGigInput,
  submission: AiReviewSubmissionInput
): Promise<AiReviewResult> {
  const scopeRes = await fetch(`${AI_BACKEND}/api/parse-scope`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: `${gig.description}\n\nDeliverables: ${gig.deliverables}`,
      work_type: gig.category,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!scopeRes.ok) throw new Error("Scope parsing failed")
  const scope = await scopeRes.json()

  const evalRes = await fetch(`${AI_BACKEND}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deliverable_text: submission.textContent ?? "",
      deliverable_url: submission.url ?? null,
      criteria: scope.criteria,
      work_type: gig.category,
      files: submission.files ?? [],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!evalRes.ok) throw new Error("Evaluation failed")
  const evaluation = await evalRes.json()

  return {
    criteria: scope.criteria,
    evaluations: evaluation.evaluations,
    verdict: evaluation.verdict,
  }
}
