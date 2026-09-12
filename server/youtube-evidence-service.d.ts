import type { YouTubeUsageStore } from "./youtube-usage-store.js"

export type YouTubeCanonicalHotel = {
  source: "google_places"
  placeId: string | null
  name: string
  city: string
  country: string
}

export type YouTubeVideoEvidence = {
  source: "youtube"
  type: "video"
  sourceId: string
  hotelId: string | null
  title: string
  text: string | null
  author: string | null
  publishedAt: string | null
  sourceUrl: string
  metadata: {
    videoId: string
    channelId: string | null
    relevance: "strong" | "ambiguous"
    commentsUnavailable: boolean
  }
}

export type YouTubeCommentEvidence = {
  source: "youtube"
  type: "comment"
  sourceId: string
  hotelId: string | null
  parentSourceId: string
  title: null
  text: string
  author: string | null
  publishedAt: string | null
  sourceUrl: string
  metadata: { videoId: string }
}

export type YouTubeUsage = {
  searchRequests: number
  metadataRequests: number
  commentRequests: number
  totalRequests: number
  requestsToday: number
  dailyLimit: number
  cacheHits: number
  cacheMisses: number
  failedRequests: number
  retries: number
}

export type YouTubeEvidenceResult = {
  provider: "youtube"
  providerStatus: "success" | "partial" | "no_evidence"
  providerError: { code: string; message: string } | null
  hotel: YouTubeCanonicalHotel
  queries: string[]
  videosFound: number
  videosProcessed: number
  videosUnavailable: number
  commentsRetrieved: number
  commentsUnavailableVideoIds: string[]
  evidenceRetrieved: number
  evidence: Array<YouTubeVideoEvidence | YouTubeCommentEvidence>
  usage: YouTubeUsage
}

export type YouTubeEvidenceCache = {
  get(key: string): unknown | Promise<unknown>
  set(key: string, value: unknown): unknown | Promise<unknown>
  delete?(key: string): unknown | Promise<unknown>
}

export declare const YOUTUBE_SEARCH_ENDPOINT: string
export declare const YOUTUBE_VIDEOS_ENDPOINT: string
export declare const YOUTUBE_COMMENTS_ENDPOINT: string
export declare const MAX_YOUTUBE_SEARCH_REQUESTS: 3
export declare const MAX_YOUTUBE_VIDEOS: 10
export declare const MAX_YOUTUBE_COMMENTS_PER_VIDEO: 20
export declare const YOUTUBE_CACHE_TTL_MS: number

export declare class YouTubeEvidenceError extends Error {
  code: string
  status: number
  retryable: boolean
  retryAfter: string | null
  commentUnavailable: boolean
}

export declare function generateYouTubeHotelQueries(
  hotel: YouTubeCanonicalHotel,
): string[]

export declare function createYouTubeEvidenceService(options: {
  apiKey: string
  dailyLimit?: unknown
  fetchImpl?: typeof fetch
  logger?: Pick<Console, "info" | "warn">
  cache?: YouTubeEvidenceCache
  inFlight?: Map<string, Promise<YouTubeEvidenceResult>>
  usageStore?: YouTubeUsageStore
  now?: () => number
}): {
  searchHotelVideos(hotel: YouTubeCanonicalHotel): string[]
  getHotelYouTubeEvidence(
    hotel: YouTubeCanonicalHotel,
  ): Promise<YouTubeEvidenceResult>
}
