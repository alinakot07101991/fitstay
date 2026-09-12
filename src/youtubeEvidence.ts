export type CanonicalYouTubeHotel = {
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

export type YouTubeEvidenceResponse = {
  provider: "youtube"
  providerStatus: "success" | "partial" | "no_evidence"
  providerError: { code: string; message: string } | null
  hotel: CanonicalYouTubeHotel
  queries: string[]
  videosFound: number
  videosProcessed: number
  videosUnavailable: number
  commentsRetrieved: number
  commentsUnavailableVideoIds: string[]
  evidenceRetrieved: number
  evidence: Array<YouTubeVideoEvidence | YouTubeCommentEvidence>
  usage: {
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
}

export class YouTubeEvidenceRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "YouTubeEvidenceRequestError"
    this.status = status
    this.code = code
  }
}

/** Call only as part of an explicit hotel analysis action. */
export async function fetchYouTubeEvidence(input: {
  hotel: CanonicalYouTubeHotel
  signal?: AbortSignal
}): Promise<YouTubeEvidenceResponse> {
  const response = await fetch("/api/youtube/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotel: input.hotel }),
    signal: input.signal,
  })
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeEvidenceResponse | {
    error?: { code?: string; message?: string }
  } | null

  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null
    throw new YouTubeEvidenceRequestError(
      response.status,
      error?.code || "YOUTUBE_REQUEST_FAILED",
      error?.message || "YouTube evidence could not be retrieved",
    )
  }
  return payload as YouTubeEvidenceResponse
}
