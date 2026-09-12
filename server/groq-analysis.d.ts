import type { ProviderUsageStore } from "./provider-usage-store.js"
import type {
  GroqAnalysisCache,
  HotelAnalysisResult,
} from "./groq-analysis-service.js"

export declare const MAX_GROQ_ANALYSIS_REQUEST_BYTES: number

export declare function handleGroqHotelAnalysis(
  request: Request,
  apiKey?: string,
  options?: {
    model?: string
    maxEvidenceItems?: unknown
    maxBatches?: unknown
    dailyAnalysisLimit?: unknown
    fetchImpl?: typeof fetch
    cache?: GroqAnalysisCache
    inFlight?: Map<string, Promise<HotelAnalysisResult>>
    usageStore?: ProviderUsageStore
    logger?: Pick<Console, "info" | "warn">
    now?: () => number
    sleep?: (milliseconds: number) => Promise<void>
  },
): Promise<Response>
