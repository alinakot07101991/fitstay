import {
  createInMemoryYouTubeUsageStore,
  parseYouTubeDailyLimit,
  youtubeUtcDay,
} from "./youtube-usage-store.js"

export const YOUTUBE_SEARCH_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/search"
export const YOUTUBE_VIDEOS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/videos"
export const YOUTUBE_COMMENTS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/commentThreads"
export const MAX_YOUTUBE_SEARCH_REQUESTS = 3
export const MAX_YOUTUBE_VIDEOS = 10
export const MAX_YOUTUBE_COMMENTS_PER_VIDEO = 20
export const YOUTUBE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const MAX_CACHE_ENTRIES = 200
const GENERIC_HOTEL_WORDS = new Set([
  "hotel",
  "hotels",
  "resort",
  "resorts",
  "spa",
  "the",
  "inn",
  "suites",
  "suite",
])
const sharedEvidenceCache = new Map()
const sharedInFlightRequests = new Map()
const sharedUsageStore = createInMemoryYouTubeUsageStore()

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .trim()
}

function cleanQueryPart(value) {
  return String(value || "")
    .replace(/["\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function safeHotel(hotel) {
  return {
    source: "google_places",
    placeId: stringOrNull(hotel.placeId),
    name: stringOrNull(hotel.name) || "",
    city: stringOrNull(hotel.city) || "",
    country: stringOrNull(hotel.country) || "",
  }
}

function evidenceCacheKey(hotel) {
  const placeId = normalize(hotel.placeId)
  return placeId
    ? `place:${placeId}`
    : `hotel:${[hotel.name, hotel.city, hotel.country].map(normalize).join("|")}`
}

async function readCache(cache, key, now) {
  const entry = await cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= now) {
    await cache.delete?.(key)
    return null
  }
  return entry.value
}

async function writeCache(cache, key, value, now) {
  if (typeof cache.size === "number" && cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  await cache.set(key, { value, expiresAt: now + YOUTUBE_CACHE_TTL_MS })
}

export function generateYouTubeHotelQueries(hotel) {
  const name = cleanQueryPart(hotel.name)
  const location = [hotel.city, hotel.country]
    .map(cleanQueryPart)
    .filter(Boolean)
    .join(" ")
  const identity = `"${name}"${location ? ` ${location}` : ""}`
  return [
    `${identity} hotel review`,
    `${identity} room tour`,
    `${identity} guest experience`,
  ]
}

function youtubeVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

function youtubeCommentUrl(videoId, commentId) {
  return `${youtubeVideoUrl(videoId)}&lc=${encodeURIComponent(commentId)}`
}

function relevanceForSnippet(snippet, hotel) {
  const title = stringOrNull(snippet?.title) || ""
  const description = stringOrNull(snippet?.description) || ""
  const channel = stringOrNull(snippet?.channelTitle) || ""
  const haystack = normalize(`${title} ${description} ${channel}`)
  const hotelName = normalize(hotel.name)
  const tokens = hotelName
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_HOTEL_WORDS.has(token))
  const matchedTokens = tokens.filter((token) => haystack.includes(token))
  const tokenRatio = matchedTokens.length / Math.max(tokens.length, 1)
  const exactName = hotelName.length > 0 && haystack.includes(hotelName)
  const cityMatch =
    normalize(hotel.city) && haystack.includes(normalize(hotel.city))
  const countryMatch =
    normalize(hotel.country) && haystack.includes(normalize(hotel.country))

  if (!exactName && (matchedTokens.length === 0 || tokenRatio < 0.5))
    return "irrelevant"
  if (
    (exactName && (tokens.length >= 2 || cityMatch || countryMatch)) ||
    (tokenRatio >= 0.8 && Boolean(cityMatch || countryMatch))
  )
    return "strong"
  return "ambiguous"
}

function reasonFromPayload(payload) {
  const errors =
    isRecord(payload?.error) && Array.isArray(payload.error.errors)
      ? payload.error.errors
      : []
  return (
    errors
      .filter(isRecord)
      .map((item) => stringOrNull(item.reason))
      .filter(Boolean)[0] || null
  )
}

function messageFromPayload(payload) {
  return isRecord(payload?.error) && typeof payload.error.message === "string"
    ? payload.error.message
    : "YouTube request failed"
}

export class YouTubeEvidenceError extends Error {
  constructor(code, message, status = 502, options = {}) {
    super(message)
    this.name = "YouTubeEvidenceError"
    this.code = code
    this.status = status
    this.retryable = Boolean(options.retryable)
    this.retryAfter = options.retryAfter || null
    this.commentUnavailable = Boolean(options.commentUnavailable)
  }
}

function mapYouTubeFailure(payload, response, operation) {
  const reason = reasonFromPayload(payload)
  const message = messageFromPayload(payload)
  const normalized = normalize(`${reason || ""} ${message}`)
  const retryAfter = response.headers.get("Retry-After")

  if (operation === "comments" && /commentsdisabled/.test(normalized)) {
    return new YouTubeEvidenceError(
      "YOUTUBE_COMMENTS_DISABLED",
      "Comments are disabled for this video",
      200,
      { commentUnavailable: true },
    )
  }
  if (
    operation === "comments" &&
    (response.status === 404 ||
      /videonotfound|commentthreadnotfound|forbidden/.test(normalized))
  ) {
    return new YouTubeEvidenceError(
      "YOUTUBE_COMMENTS_UNAVAILABLE",
      "Comments are unavailable for this video",
      200,
      { commentUnavailable: true },
    )
  }
  if (
    response.status === 401 ||
    /keyinvalid|apikeynotvalid|api key not valid|accessnotconfigured/.test(
      normalized,
    )
  ) {
    return new YouTubeEvidenceError(
      "YOUTUBE_INVALID_API_KEY",
      "YouTube access is not configured correctly",
      503,
    )
  }
  if (/quotaexceeded|dailylimitexceeded|quota exceeded/.test(normalized)) {
    return new YouTubeEvidenceError(
      "YOUTUBE_QUOTA_EXCEEDED",
      "The YouTube API quota has been exceeded",
      429,
      { retryAfter },
    )
  }
  if (
    response.status === 429 ||
    /ratelimitexceeded|rate limit|too many requests/.test(normalized)
  ) {
    return new YouTubeEvidenceError(
      "YOUTUBE_RATE_LIMITED",
      "YouTube is temporarily rate limited",
      429,
      { retryable: true, retryAfter },
    )
  }
  if (response.status === 400) {
    return new YouTubeEvidenceError(
      "YOUTUBE_BAD_REQUEST",
      "YouTube rejected the evidence request",
      400,
    )
  }
  return new YouTubeEvidenceError(
    "YOUTUBE_UNAVAILABLE",
    "YouTube evidence is temporarily unavailable",
    502,
    { retryable: response.status >= 500, retryAfter },
  )
}

async function parseJson(response) {
  try {
    const payload = await response.json()
    if (!isRecord(payload)) throw new Error("Malformed response")
    return payload
  } catch {
    throw new YouTubeEvidenceError(
      "YOUTUBE_MALFORMED_RESPONSE",
      "YouTube returned an unexpected response",
      502,
    )
  }
}

function canCallOperation(operation, stats) {
  if (operation === "search")
    return stats.searchRequests < MAX_YOUTUBE_SEARCH_REQUESTS
  if (operation === "metadata") return stats.metadataRequests < 2
  return stats.commentRequests < MAX_YOUTUBE_VIDEOS + 1
}

async function youtubeGet({ endpoint, params, operation, context }) {
  let attempt = 0
  while (attempt < 2) {
    if (!canCallOperation(operation, context.stats)) {
      throw new YouTubeEvidenceError(
        "YOUTUBE_DEV_LIMIT_REACHED",
        `The YouTube ${operation} development limit has been reached for this hotel analysis`,
        429,
      )
    }

    const timestamp = context.now()
    const reservation = await context.usageStore.reserve(
      youtubeUtcDay(timestamp),
      context.dailyLimit,
      new Date(timestamp).toISOString(),
    )
    context.stats.requestsToday = reservation.count
    if (!reservation.allowed) {
      throw new YouTubeEvidenceError(
        "YOUTUBE_DEV_LIMIT_REACHED",
        "The YouTube daily development request limit has been reached",
        429,
      )
    }

    context.stats.totalRequests += 1
    if (operation === "search") context.stats.searchRequests += 1
    else if (operation === "metadata") context.stats.metadataRequests += 1
    else context.stats.commentRequests += 1

    const url = new URL(endpoint)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
    url.searchParams.set("key", context.apiKey)

    let response
    try {
      response = await context.fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
    } catch {
      context.stats.failedRequests += 1
      const failure = new YouTubeEvidenceError(
        "YOUTUBE_NETWORK_ERROR",
        "A network error interrupted the YouTube request",
        502,
        { retryable: true },
      )
      if (
        attempt === 0 &&
        context.stats.retries === 0 &&
        canCallOperation(operation, context.stats)
      ) {
        context.stats.retries += 1
        attempt += 1
        continue
      }
      throw failure
    }

    let payload
    try {
      payload = await parseJson(response)
    } catch (error) {
      context.stats.failedRequests += 1
      throw error
    }
    if (!response.ok || payload.error) {
      const failure = mapYouTubeFailure(payload, response, operation)
      context.stats.failedRequests += 1
      if (
        failure.retryable &&
        attempt === 0 &&
        context.stats.retries === 0 &&
        canCallOperation(operation, context.stats)
      ) {
        context.stats.retries += 1
        attempt += 1
        continue
      }
      throw failure
    }
    return payload
  }
  throw new YouTubeEvidenceError(
    "YOUTUBE_UNAVAILABLE",
    "YouTube evidence is unavailable",
    502,
  )
}

function requireItems(payload, operation) {
  if (!Array.isArray(payload.items)) {
    throw new YouTubeEvidenceError(
      "YOUTUBE_MALFORMED_RESPONSE",
      `YouTube ${operation} returned an unexpected response`,
      502,
    )
  }
  return payload.items.filter(isRecord)
}

function searchCandidates(items, hotel, candidates) {
  for (const item of items) {
    const videoId = stringOrNull(item.id?.videoId)
    const snippet = isRecord(item.snippet) ? item.snippet : {}
    if (!videoId) continue
    const relevance = relevanceForSnippet(snippet, hotel)
    if (relevance === "irrelevant") continue
    const existing = candidates.get(videoId)
    if (
      !existing ||
      (existing.relevance === "ambiguous" && relevance === "strong")
    ) {
      candidates.set(videoId, { videoId, snippet, relevance })
    }
  }
}

function normalizeVideo(video, hotelId, relevance) {
  const snippet = isRecord(video.snippet) ? video.snippet : {}
  const videoId = String(video.id)
  return {
    source: "youtube",
    type: "video",
    sourceId: videoId,
    hotelId,
    title: stringOrNull(snippet.title) || "Untitled YouTube video",
    text: stringOrNull(snippet.description),
    author: stringOrNull(snippet.channelTitle),
    publishedAt: stringOrNull(snippet.publishedAt),
    sourceUrl: youtubeVideoUrl(videoId),
    metadata: {
      videoId,
      channelId: stringOrNull(snippet.channelId),
      relevance,
      commentsUnavailable: false,
    },
  }
}

function normalizeComment(thread, videoId, hotelId) {
  const topLevelComment = isRecord(thread.snippet?.topLevelComment)
    ? thread.snippet.topLevelComment
    : {}
  const snippet = isRecord(topLevelComment.snippet)
    ? topLevelComment.snippet
    : {}
  const commentId = stringOrNull(topLevelComment.id) || stringOrNull(thread.id)
  const text =
    typeof snippet.textOriginal === "string"
      ? snippet.textOriginal
      : typeof snippet.textDisplay === "string"
        ? snippet.textDisplay
        : ""
  if (!commentId || !text) return null
  return {
    source: "youtube",
    type: "comment",
    sourceId: commentId,
    hotelId,
    parentSourceId: videoId,
    title: null,
    text,
    author: stringOrNull(snippet.authorDisplayName),
    publishedAt: stringOrNull(snippet.publishedAt),
    sourceUrl: youtubeCommentUrl(videoId, commentId),
    metadata: { videoId },
  }
}

function emptyStats(dailyLimit) {
  return {
    searchRequests: 0,
    metadataRequests: 0,
    commentRequests: 0,
    totalRequests: 0,
    requestsToday: 0,
    dailyLimit,
    cacheHits: 0,
    cacheMisses: 1,
    failedRequests: 0,
    retries: 0,
  }
}

export function createYouTubeEvidenceService(options) {
  const apiKey = options.apiKey
  const fetchImpl = options.fetchImpl || fetch
  const logger = options.logger || console
  const cache = options.cache || sharedEvidenceCache
  const inFlight = options.inFlight || sharedInFlightRequests
  const usageStore = options.usageStore || sharedUsageStore
  const dailyLimit = parseYouTubeDailyLimit(options.dailyLimit)
  const now = options.now || (() => Date.now())

  async function collectUncached(hotel) {
    const stats = emptyStats(dailyLimit)
    const queries = generateYouTubeHotelQueries(hotel)
    const candidates = new Map()
    const context = { apiKey, fetchImpl, usageStore, dailyLimit, now, stats }

    try {
      for (const query of queries) {
        if (!canCallOperation("search", stats)) break
        const payload = await youtubeGet({
          endpoint: YOUTUBE_SEARCH_ENDPOINT,
          params: {
            part: "snippet",
            type: "video",
            maxResults: MAX_YOUTUBE_VIDEOS,
            order: "relevance",
            safeSearch: "moderate",
            q: query,
          },
          operation: "search",
          context,
        })
        searchCandidates(requireItems(payload, "Search"), hotel, candidates)
      }

      const selectedCandidates = [...candidates.values()].slice(
        0,
        MAX_YOUTUBE_VIDEOS,
      )
      if (selectedCandidates.length === 0) {
        const result = {
          provider: "youtube",
          providerStatus: "no_evidence",
          providerError: null,
          hotel,
          queries,
          videosFound: 0,
          videosProcessed: 0,
          videosUnavailable: 0,
          commentsRetrieved: 0,
          commentsUnavailableVideoIds: [],
          evidenceRetrieved: 0,
          evidence: [],
        }
        return { result, stats, cacheable: true }
      }

      const metadataPayload = await youtubeGet({
        endpoint: YOUTUBE_VIDEOS_ENDPOINT,
        params: {
          part: "snippet,status",
          id: selectedCandidates.map((item) => item.videoId).join(","),
        },
        operation: "metadata",
        context,
      })
      const metadataItems = requireItems(metadataPayload, "Videos")
      const candidateById = new Map(
        selectedCandidates.map((item) => [item.videoId, item]),
      )
      const processedVideos = []
      for (const item of metadataItems) {
        const videoId = stringOrNull(item.id)
        if (!videoId || !candidateById.has(videoId)) continue
        const status = isRecord(item.status) ? item.status : {}
        if (status.privacyStatus && status.privacyStatus !== "public") continue
        if (status.uploadStatus && status.uploadStatus !== "processed") continue
        const relevance = relevanceForSnippet(item.snippet, hotel)
        if (relevance === "irrelevant") continue
        processedVideos.push(normalizeVideo(item, hotel.placeId, relevance))
      }

      const evidence = [...processedVideos]
      const commentsUnavailableVideoIds = []
      let providerError = null

      for (let index = 0; index < processedVideos.length; index += 1) {
        const video = processedVideos[index]
        try {
          const commentsPayload = await youtubeGet({
            endpoint: YOUTUBE_COMMENTS_ENDPOINT,
            params: {
              part: "snippet",
              videoId: video.metadata.videoId,
              maxResults: MAX_YOUTUBE_COMMENTS_PER_VIDEO,
              order: "relevance",
              textFormat: "plainText",
            },
            operation: "comments",
            context,
          })
          for (const thread of requireItems(commentsPayload, "Comments")) {
            const comment = normalizeComment(
              thread,
              video.metadata.videoId,
              hotel.placeId,
            )
            if (comment) evidence.push(comment)
          }
        } catch (error) {
          video.metadata.commentsUnavailable = true
          commentsUnavailableVideoIds.push(video.metadata.videoId)
          if (error instanceof YouTubeEvidenceError && error.commentUnavailable)
            continue

          providerError = {
            code:
              error instanceof YouTubeEvidenceError
                ? error.code
                : "YOUTUBE_UNAVAILABLE",
            message:
              error instanceof YouTubeEvidenceError
                ? error.message
                : "YouTube comments are temporarily unavailable",
          }
          for (const remaining of processedVideos.slice(index + 1)) {
            remaining.metadata.commentsUnavailable = true
            commentsUnavailableVideoIds.push(remaining.metadata.videoId)
          }
          break
        }
      }

      const result = {
        provider: "youtube",
        providerStatus: providerError ? "partial" : "success",
        providerError,
        hotel,
        queries,
        videosFound: selectedCandidates.length,
        videosProcessed: processedVideos.length,
        videosUnavailable: selectedCandidates.length - processedVideos.length,
        commentsRetrieved: evidence.filter((item) => item.type === "comment")
          .length,
        commentsUnavailableVideoIds: [...new Set(commentsUnavailableVideoIds)],
        evidenceRetrieved: evidence.length,
        evidence,
      }
      return { result, stats, cacheable: !providerError }
    } catch (error) {
      logger.warn?.("[youtube] hotel evidence failed", {
        failureType:
          error instanceof YouTubeEvidenceError
            ? error.code
            : "YOUTUBE_UNAVAILABLE",
        hotel: hotel.name,
        uniqueVideosFound: candidates.size,
        ...stats,
      })
      throw error
    }
  }

  async function getHotelYouTubeEvidence(hotelInput) {
    const hotel = safeHotel(hotelInput)
    const key = evidenceCacheKey(hotel)
    const timestamp = now()
    const cached = await readCache(cache, key, timestamp)
    if (cached) {
      const requestsToday = await usageStore.getCount(youtubeUtcDay(timestamp))
      const usage = {
        ...emptyStats(dailyLimit),
        cacheHits: 1,
        cacheMisses: 0,
        requestsToday,
      }
      logger.info?.("[youtube] hotel evidence", {
        outcome: "cache_hit",
        hotel: hotel.name,
        videosProcessed: cached.videosProcessed,
        commentsRetrieved: cached.commentsRetrieved,
        ...usage,
      })
      return { ...cached, usage }
    }
    if (inFlight.has(key)) return inFlight.get(key)

    const request = collectUncached(hotel)
      .then(async ({ result, stats, cacheable }) => {
        if (cacheable) await writeCache(cache, key, result, now())
        logger.info?.("[youtube] hotel evidence", {
          outcome: result.providerStatus,
          hotel: hotel.name,
          uniqueVideosFound: result.videosFound,
          videosProcessed: result.videosProcessed,
          commentsRetrieved: result.commentsRetrieved,
          ...stats,
        })
        return { ...result, usage: stats }
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
    return request
  }

  return {
    searchHotelVideos: generateYouTubeHotelQueries,
    getHotelYouTubeEvidence,
  }
}
