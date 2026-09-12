export type HotelPreferencePriority = "critical" | "important" | "nice_to_have"

export type HotelPreferenceInput = {
  name: string
  priority: HotelPreferencePriority
}

export type CanonicalHotelEvidenceInput = {
  source: "google_places"
  placeId: string | null
  name: string
  city: string
  country: string
}

export type TavilyWebEvidence = {
  source: "web"
  provider: "tavily"
  domain: string
  title: string | null
  text: string
  sourceUrl: string
  retrievedAt: string
  relevanceScore: number | null
}

export type TavilyEvidenceResult = {
  hotel: CanonicalHotelEvidenceInput
  queries: string[]
  evidenceRetrieved: number
  evidence: TavilyWebEvidence[]
  usage: {
    searchRequests: number
    extractRequests: number
    extractOperations: number
    cacheHits: number
    cacheMisses: number
    failedRequests: number
    retries: number
  }
}

export class TavilyEvidenceRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "TavilyEvidenceRequestError"
    this.status = status
    this.code = code
  }
}

/** Call only after the user explicitly submits a hotel analysis. */
export async function fetchTavilyEvidence(input: {
  hotel: CanonicalHotelEvidenceInput
  preferences: HotelPreferenceInput[]
  signal?: AbortSignal
}): Promise<TavilyEvidenceResult> {
  const response = await fetch("/api/tavily/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotel: input.hotel, preferences: input.preferences }),
    signal: input.signal,
  })
  const payload = await response.json().catch(() => null) as TavilyEvidenceResult | {
    error?: { code?: string; message?: string }
  } | null

  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null
    throw new TavilyEvidenceRequestError(
      response.status,
      error?.code || "tavily_request_failed",
      error?.message || "Open-web evidence could not be retrieved",
    )
  }
  return payload as TavilyEvidenceResult
}
