import type {
  YouTubeEvidenceCache,
  YouTubeEvidenceResult,
} from "./youtube-evidence-service.js"
import type { YouTubeUsageStore } from "./youtube-usage-store.js"

export declare function handleYouTubeHotelEvidence(
  request: Request,
  apiKey?: string,
  options?: {
    dailyLimit?: unknown
    fetchImpl?: typeof fetch
    logger?: Pick<Console, "info" | "warn">
    cache?: YouTubeEvidenceCache
    inFlight?: Map<string, Promise<YouTubeEvidenceResult>>
    usageStore?: YouTubeUsageStore
    now?: () => number
  },
): Promise<Response>
