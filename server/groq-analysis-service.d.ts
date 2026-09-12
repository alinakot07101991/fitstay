import type { ProviderUsageStore } from "./provider-usage-store.js"

export type AnalysisPriority = "critical" | "important" | "nice_to_have"
export type AnalysisStatus =
  | "strong_match"
  | "match"
  | "mixed"
  | "mismatch"
  | "strong_mismatch"
  | "insufficient_evidence"
export type AnalysisConfidence = "high" | "medium" | "low"

export type CanonicalAnalysisHotel = {
  source: "google_places"
  placeId: string | null
  name: string
  city: string
  country: string
}

export type AnalysisPreference = {
  id: string
  label: string
  priority: AnalysisPriority
}

export type NormalizedAnalysisEvidence = {
  evidenceId?: string
  id?: string
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
  relevance?: string | null
  metadata?: Record<string, unknown> | null
}

export type PreferenceAnalysis = {
  preferenceId: string
  priority: AnalysisPriority
  status: AnalysisStatus
  confidence: AnalysisConfidence
  summary: string
  positiveEvidenceIds: string[]
  negativeEvidenceIds: string[]
  evidenceCount: number
  independentSourceCount: number
}

export type HotelAnalysisResult = {
  hotelId: string | null
  hotel: CanonicalAnalysisHotel
  preferences: PreferenceAnalysis[]
  matchScore: number | null
  hasCriticalConflict: boolean
  overallConfidence: AnalysisConfidence
  evidenceStats: Record<string, unknown>
  referencedEvidence: Array<Record<string, unknown>>
  providerErrors: Array<{ provider: string; code: string; message: string }>
  model: string
  analysisVersion: string
  evidenceHash: string
  cacheHit?: boolean
  analysesToday?: number
  dailyAnalysisLimit?: number
}

export type GroqAnalysisCache = {
  get(key: string): unknown | Promise<unknown>
  set(key: string, value: unknown): unknown | Promise<unknown>
  delete?(key: string): unknown | Promise<unknown>
}

export declare const GROQ_CHAT_COMPLETIONS_ENDPOINT: string
export declare const DEFAULT_GROQ_MODEL: "openai/gpt-oss-120b"
export declare const DEFAULT_GROQ_MAX_EVIDENCE_ITEMS: 20
export declare const DEFAULT_GROQ_DAILY_ANALYSIS_LIMIT: 20
export declare const GROQ_ANALYSIS_CACHE_TTL_MS: number
export declare const GROQ_ANALYSIS_VERSION: string
export declare const MATCH_SCORE_VERSION: string

export declare class GroqAnalysisError extends Error {
  code: string
  status: number
  retryable: boolean
  retryAfter: string | null
}

export declare function normalizePreferencePriority(value: unknown): AnalysisPriority
export declare function prepareEvidence(
  evidence: NormalizedAnalysisEvidence[],
  preferences: AnalysisPreference[],
  maxItems: number,
): {
  items: Array<Record<string, unknown>>
  selected: Array<Record<string, unknown>>
  stats: Record<string, unknown>
}
export declare function buildGroqMessages(
  hotel: CanonicalAnalysisHotel,
  preferences: AnalysisPreference[],
  evidence: Array<Record<string, unknown>>,
  maxTextCharacters?: number,
): Array<{ role: "system" | "user"; content: string }>
export declare function validateGroqStructuredOutput(
  value: unknown,
  preferences: AnalysisPreference[],
  evidenceIds: string[],
): Record<string, unknown>
export declare function calculateMatchScore(
  preferences: AnalysisPreference[],
  classifications: Array<{ preferenceId: string; status: AnalysisStatus }>,
): {
  matchScore: number | null
  rawMatchScore: number | null
  weightedAchievedScore: number
  weightedAvailableScore: number
  evaluatedPreferenceCount: number
}
export declare function buildHotelAnalysisResult(input: Record<string, unknown>): HotelAnalysisResult
export declare function createGroqAnalysisService(options: {
  apiKey: string
  model?: string
  maxEvidenceItems?: unknown
  dailyAnalysisLimit?: unknown
  fetchImpl?: typeof fetch
  cache?: GroqAnalysisCache
  inFlight?: Map<string, Promise<HotelAnalysisResult>>
  usageStore?: ProviderUsageStore
  logger?: Pick<Console, "info" | "warn">
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
}): {
  analyzeHotelPreferences(input: {
    hotel: CanonicalAnalysisHotel
    preferences: AnalysisPreference[]
    evidence: NormalizedAnalysisEvidence[]
    providerErrors: Array<{ provider: string; code: string; message: string }>
  }): Promise<HotelAnalysisResult>
}
