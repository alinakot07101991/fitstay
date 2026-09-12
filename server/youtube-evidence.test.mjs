import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_YOUTUBE_SEARCH_REQUESTS,
  MAX_YOUTUBE_VIDEOS,
  YOUTUBE_COMMENTS_ENDPOINT,
  YOUTUBE_SEARCH_ENDPOINT,
  YOUTUBE_VIDEOS_ENDPOINT,
  generateYouTubeHotelQueries,
} from "./youtube-evidence-service.js"
import { handleYouTubeHotelEvidence } from "./youtube-evidence.js"
import { createInMemoryYouTubeUsageStore } from "./youtube-usage-store.js"

const canonicalHotel = {
  source: "google_places",
  placeId: "ChIJ-hotel-eden",
  name: "Hotel Eden",
  city: "Rome",
  country: "Italy",
}

function request(hotel = canonicalHotel) {
  return new Request("http://localhost/api/youtube/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotel }),
  })
}

function searchItem(videoId, overrides = {}) {
  return {
    id: { videoId },
    snippet: {
      title: `Hotel Eden Rome review ${videoId}`,
      description: "An original guest description",
      channelId: "channel-1",
      channelTitle: "Travel Notes",
      publishedAt: "2026-08-01T10:00:00Z",
      ...overrides,
    },
  }
}

function videoItem(videoId, overrides = {}) {
  const search = searchItem(videoId, overrides)
  return {
    id: videoId,
    snippet: search.snippet,
    status: { privacyStatus: "public", uploadStatus: "processed" },
  }
}

function commentThread(videoId, index = 1) {
  return {
    id: `thread-${videoId}-${index}`,
    snippet: {
      topLevelComment: {
        id: `comment-${videoId}-${index}`,
        snippet: {
          textOriginal: `Original comment ${index}`,
          authorDisplayName: "Hotel guest",
          publishedAt: "2026-08-02T10:00:00Z",
        },
      },
    },
  }
}

function options(fetchImpl, extra = {}) {
  return {
    fetchImpl,
    cache: new Map(),
    inFlight: new Map(),
    usageStore: createInMemoryYouTubeUsageStore(),
    logger: { info() {}, warn() {} },
    now: () => Date.parse("2026-09-12T08:00:00.000Z"),
    ...extra,
  }
}

test("generates exactly three controlled hotel queries", () => {
  assert.deepEqual(generateYouTubeHotelQueries(canonicalHotel), [
    '"Hotel Eden" Rome Italy hotel review',
    '"Hotel Eden" Rome Italy room tour',
    '"Hotel Eden" Rome Italy guest experience',
  ])
})

test("deduplicates videos and normalizes traceable video and comment evidence", async () => {
  let searchCalls = 0
  let metadataCalls = 0
  let commentCalls = 0
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async (input) => {
      const url = new URL(input)
      assert.equal(url.searchParams.get("key"), "server-secret")
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT) {
        searchCalls += 1
        assert.equal(url.searchParams.get("type"), "video")
        assert.equal(url.searchParams.get("maxResults"), "10")
        assert.equal(url.searchParams.has("pageToken"), false)
        return Response.json({
          items: [
            searchItem("video-1"),
            searchItem("video-1"),
            searchItem("video-2"),
          ],
        })
      }
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        metadataCalls += 1
        assert.equal(url.searchParams.get("part"), "snippet,status")
        return Response.json({
          items: [videoItem("video-1"), videoItem("video-2")],
        })
      }
      assert.equal(url.origin + url.pathname, YOUTUBE_COMMENTS_ENDPOINT)
      commentCalls += 1
      const videoId = url.searchParams.get("videoId")
      assert.equal(url.searchParams.get("maxResults"), "20")
      assert.equal(url.searchParams.get("textFormat"), "plainText")
      assert.equal(url.searchParams.has("pageToken"), false)
      return Response.json({ items: [commentThread(videoId)] })
    }),
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(searchCalls, MAX_YOUTUBE_SEARCH_REQUESTS)
  assert.equal(metadataCalls, 1)
  assert.equal(commentCalls, 2)
  assert.equal(payload.videosFound, 2)
  assert.equal(payload.videosProcessed, 2)
  assert.equal(payload.commentsRetrieved, 2)
  assert.equal(
    payload.evidence.filter((item) => item.type === "video").length,
    2,
  )
  assert.equal(
    payload.evidence.filter((item) => item.type === "comment").length,
    2,
  )
  assert.deepEqual(
    payload.evidence.find((item) => item.type === "comment"),
    {
      source: "youtube",
      type: "comment",
      sourceId: "comment-video-1-1",
      hotelId: "ChIJ-hotel-eden",
      parentSourceId: "video-1",
      title: null,
      text: "Original comment 1",
      author: "Hotel guest",
      publishedAt: "2026-08-02T10:00:00Z",
      sourceUrl: "https://www.youtube.com/watch?v=video-1&lc=comment-video-1-1",
      metadata: { videoId: "video-1" },
    },
  )
})

test("processes no more than ten unique videos", async () => {
  const videos = Array.from({ length: 15 }, (_, index) =>
    searchItem(`video-${index}`),
  )
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async (input) => {
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT)
        return Response.json({ items: videos })
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        const ids = url.searchParams.get("id").split(",")
        assert.equal(ids.length, MAX_YOUTUBE_VIDEOS)
        return Response.json({ items: ids.map((id) => videoItem(id)) })
      }
      return Response.json({ items: [] })
    }),
  )

  const payload = await response.json()
  assert.equal(payload.videosProcessed, MAX_YOUTUBE_VIDEOS)
  assert.equal(payload.usage.commentRequests, MAX_YOUTUBE_VIDEOS)
})

test("reuses seven-day hotel cache without additional YouTube requests", async () => {
  const cache = new Map()
  const inFlight = new Map()
  const usageStore = createInMemoryYouTubeUsageStore()
  let calls = 0
  const sharedOptions = options(
    async (input) => {
      calls += 1
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT) {
        return Response.json({ items: [searchItem("video-1")] })
      }
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        return Response.json({ items: [videoItem("video-1")] })
      }
      return Response.json({ items: [] })
    },
    { cache, inFlight, usageStore },
  )

  const first = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    sharedOptions,
  )
  const callsAfterFirst = calls
  const second = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    sharedOptions,
  )
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(calls, callsAfterFirst)
  assert.equal((await second.json()).usage.cacheHits, 1)
})

test("expires hotel evidence after the seven-day cache TTL", async () => {
  const cache = new Map()
  const inFlight = new Map()
  const usageStore = createInMemoryYouTubeUsageStore()
  let currentTime = Date.parse("2026-09-12T08:00:00.000Z")
  let calls = 0
  const sharedOptions = options(
    async (input) => {
      calls += 1
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT)
        return Response.json({ items: [] })
      throw new Error("No additional endpoint should be called")
    },
    { cache, inFlight, usageStore, now: () => currentTime },
  )

  await handleYouTubeHotelEvidence(request(), "server-secret", sharedOptions)
  const firstCallCount = calls
  currentTime += 7 * 24 * 60 * 60 * 1000 - 1
  await handleYouTubeHotelEvidence(request(), "server-secret", sharedOptions)
  assert.equal(calls, firstCallCount)

  currentTime += 2
  await handleYouTubeHotelEvidence(request(), "server-secret", sharedOptions)
  assert.ok(calls > firstCallCount)
})

test("preserves a plausible but location-ambiguous result with an explicit marker", async () => {
  const chainHotel = {
    ...canonicalHotel,
    placeId: "ChIJ-hilton",
    name: "Hilton",
  }
  const response = await handleYouTubeHotelEvidence(
    request(chainHotel),
    "server-secret",
    options(async (input) => {
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT) {
        return Response.json({
          items: [
            searchItem("hilton-video", {
              title: "Hilton hotel room tour",
              description: "A guest walks through the room",
            }),
          ],
        })
      }
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        return Response.json({
          items: [
            videoItem("hilton-video", {
              title: "Hilton hotel room tour",
              description: "A guest walks through the room",
            }),
          ],
        })
      }
      return Response.json({ items: [] })
    }),
  )

  const payload = await response.json()
  assert.equal(payload.evidence[0].metadata.relevance, "ambiguous")
})

test("enforces the configurable UTC daily application request limit", async () => {
  let calls = 0
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(
      async () => {
        calls += 1
        return Response.json({ items: [searchItem(`video-${calls}`)] })
      },
      { dailyLimit: "1" },
    ),
  )

  assert.equal(response.status, 429)
  const payload = await response.json()
  assert.equal(payload.error.code, "YOUTUBE_DEV_LIMIT_REACHED")
  assert.equal(calls, 1)
})

test("marks disabled comments unavailable without failing video evidence", async () => {
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async (input) => {
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT) {
        return Response.json({ items: [searchItem("video-1")] })
      }
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        return Response.json({ items: [videoItem("video-1")] })
      }
      return Response.json(
        {
          error: {
            code: 403,
            message: "The video has disabled comments",
            errors: [{ reason: "commentsDisabled" }],
          },
        },
        { status: 403 },
      )
    }),
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.providerStatus, "success")
  assert.deepEqual(payload.commentsUnavailableVideoIds, ["video-1"])
  assert.equal(payload.evidence[0].metadata.commentsUnavailable, true)
})

test("treats removed or private videos as unavailable", async () => {
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async (input) => {
      const url = new URL(input)
      if (url.origin + url.pathname === YOUTUBE_SEARCH_ENDPOINT) {
        return Response.json({
          items: [searchItem("available"), searchItem("removed")],
        })
      }
      if (url.origin + url.pathname === YOUTUBE_VIDEOS_ENDPOINT) {
        return Response.json({ items: [videoItem("available")] })
      }
      return Response.json({ items: [] })
    }),
  )

  const payload = await response.json()
  assert.equal(payload.videosFound, 2)
  assert.equal(payload.videosProcessed, 1)
  assert.equal(payload.videosUnavailable, 1)
})

test("maps quota and malformed responses without exposing the API key", async () => {
  const quotaResponse = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async () =>
      Response.json(
        {
          error: {
            code: 403,
            message: "Quota exceeded",
            errors: [{ reason: "quotaExceeded" }],
          },
        },
        { status: 403 },
      ),
    ),
  )
  assert.equal(quotaResponse.status, 429)
  const quotaPayload = await quotaResponse.json()
  assert.equal(quotaPayload.error.code, "YOUTUBE_QUOTA_EXCEEDED")
  assert.equal(JSON.stringify(quotaPayload).includes("server-secret"), false)

  const malformedResponse = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async () => Response.json({ unexpected: true })),
  )
  assert.equal(malformedResponse.status, 502)
  assert.equal(
    (await malformedResponse.json()).error.code,
    "YOUTUBE_MALFORMED_RESPONSE",
  )
})

test("uses at most one automatic retry across a hotel analysis", async () => {
  let attempts = 0
  const response = await handleYouTubeHotelEvidence(
    request(),
    "server-secret",
    options(async () => {
      attempts += 1
      if (attempts <= 2) throw new TypeError("network unavailable")
      return Response.json({ items: [] })
    }),
  )

  assert.equal(response.status, 502)
  const payload = await response.json()
  assert.equal(payload.error.code, "YOUTUBE_NETWORK_ERROR")
  assert.equal(attempts, 2)
})
