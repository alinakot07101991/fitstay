export type HotelAnalysisPreference = {
  id: string
  label: string
  priority: "critical" | "important" | "nice_to_have"
}

export type HotelAnalysisEvidence = {
  evidenceId?: string
  source: string
  type: string
  sourceId?: string | null
  title?: string | null
  text?: string | null
  author?: string | null
  publishedAt?: string | null
  sourceUrl?: string | null
  provider?: string | null
  domain?: string | null
  metadata?: Record<string, unknown> | null
}

export type HotelAnalysisResult = {
  status: "success"
  hotelId: string | null
  matchScore: number | null
  hasCriticalConflict: boolean
  overallConfidence: "high" | "medium" | "low"
  preferences: Array<{
    preferenceId: string
    priority: HotelAnalysisPreference["priority"]
    status: "strong_match" | "match" | "mixed" | "mismatch" | "strong_mismatch" | "insufficient_evidence"
    confidence: "high" | "medium" | "low"
    summary: string
    positiveEvidenceIds: string[]
    negativeEvidenceIds: string[]
    evidenceCount: number
    independentSourceCount: number
  }>
  evidenceStats: {
    totalEvidenceItems: number
    relevantEvidenceItems: number
    evidenceItemsAnalyzed: number
    analysisBatches: number
    independentSourceCount: number
    sourcesAnalyzed: string[]
  }
  cacheHit: boolean
}

export class HotelAnalysisRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "HotelAnalysisRequestError"
    this.status = status
    this.code = code
  }
}

/** Call only after the user explicitly starts a confirmed hotel analysis. */
export async function analyzeHotel(input: {
  hotel: {
    source: "google_places"
    placeId: string | null
    name: string
    city: string
    country: string
  }
  preferences: HotelAnalysisPreference[]
  evidence: HotelAnalysisEvidence[]
  providerErrors?: Array<{ provider: string code: string message: string }>
  signal?: AbortSignal
}): Promise<HotelAnalysisResult> {
  const response = await fetch("/api/hotel-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotel: input.hotel,
      preferences: input.preferences,
      evidence: input.evidence,
      providerErrors: input.providerErrors || [],
    }),
    signal: input.signal,
  })
  const payload = (await response
    .json()
    .catch(() => null)) as HotelAnalysisResult | {
    error?: { code?: string message?: string }
  } | null
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null
    throw new HotelAnalysisRequestError(
      response.status,
      error?.code || "GROQ_PROVIDER_ERROR",
      error?.message || "The hotel analysis could not be completed",
    )
  }
  return payload as HotelAnalysisResult
}
