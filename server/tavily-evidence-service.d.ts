export type TavilyPriority = "critical" | "important" | "nice_to_have"

export type TavilyPreference = {
  name: string
  priority: TavilyPriority
}

export type TavilyCanonicalHotel = {
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

export type TavilyUsage = {
  searchRequests: number
  extractRequests: number
  extractOperations: number
  cacheHits: number
  cacheMisses: number
  failedRequests: number
  retries: number
}

export type TavilyEvidenceResult = {
  hotel: TavilyCanonicalHotel
  queries: string[]
  evidenceRetrieved: number
  evidence: TavilyWebEvidence[]
  usage: TavilyUsage
}

export type TavilyAnalysisCache = {
  get(key: string): unknown | Promise<unknown>
  set(key: string, value: unknown): unknown | Promise<unknown>
  delete?(key: string): unknown | Promise<unknown>
}

export declare const TAVILY_SEARCH_ENDPOINT: string
export declare const TAVILY_EXTRACT_ENDPOINT: string
export declare const MAX_TAVILY_SEARCH_REQUESTS: 5
export declare const MAX_TAVILY_EXTRACT_OPERATIONS: 5
export declare const TAVILY_CACHE_TTL_MS: number

export declare class TavilyEvidenceError extends Error {
  code: string
  status: number
  retryable: boolean
  retryAfter: string | null
}

export declare function generateTavilyQueries(
  hotel: TavilyCanonicalHotel,
  preferences: TavilyPreference[],
): string[]

export declare function createTavilyEvidenceService(options: {
  apiKey: string
  fetchImpl?: typeof fetch
  logger?: Pick<Console, "info" | "warn">
  analysisCache?: TavilyAnalysisCache
  inFlight?: Map<string, Promise<TavilyEvidenceResult>>
  now?: () => number
}): {
  collectEvidence(
    hotel: TavilyCanonicalHotel,
    preferences: TavilyPreference[],
  ): Promise<TavilyEvidenceResult>
}
