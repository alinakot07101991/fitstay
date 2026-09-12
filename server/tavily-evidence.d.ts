import type {
  TavilyAnalysisCache,
  TavilyEvidenceResult,
} from "./tavily-evidence-service.js"

export declare function handleTavilyHotelEvidence(
  request: Request,
  apiKey?: string,
  options?: {
    fetchImpl?: typeof fetch
    logger?: Pick<Console, "info" | "warn">
    analysisCache?: TavilyAnalysisCache
    inFlight?: Map<string, Promise<TavilyEvidenceResult>>
    now?: () => number
  },
): Promise<Response>
