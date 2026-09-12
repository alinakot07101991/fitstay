import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_TAVILY_EXTRACT_OPERATIONS,
  MAX_TAVILY_SEARCH_REQUESTS,
  TAVILY_EXTRACT_ENDPOINT,
  TAVILY_SEARCH_ENDPOINT,
  generateTavilyQueries,
} from "./tavily-evidence-service.js"
import { handleTavilyHotelEvidence } from "./tavily-evidence.js"

const canonicalHotel = {
  source: "google_places",
  placeId: "ChIJ-hotel-eden",
  name: "Hotel Eden",
  city: "Rome",
  country: "Italy",
}

const preferences = [
  { name: "quiet room", priority: "critical" },
  { name: "elevator", priority: "critical" },
  { name: "strong Wi-Fi", priority: "important" },
  { name: "breakfast", priority: "important" },
  { name: "pool access", priority: "nice_to_have" },
  { name: "clean room", priority: "important" },
]

function request(body = { hotel: canonicalHotel, preferences }) {
  return new Request("http://localhost/api/tavily/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("groups related preferences into at most five targeted queries", () => {
  const queries = generateTavilyQueries(canonicalHotel, preferences)
  assert.ok(queries.length <= MAX_TAVILY_SEARCH_REQUESTS)
  assert.ok(queries.length < preferences.length)
  assert.ok(queries.every((query) => query.includes('"Hotel Eden Rome Italy"')))
  assert.ok(queries.some((query) => query.includes("quiet room") && query.includes("clean room")))
  assert.ok(queries.some((query) => query.includes("elevator")))
})

test("normalizes substantive Search results without unnecessary Extract", async () => {
  const calls = []
  const longText = "A detailed independent account of the hotel experience. ".repeat(6)
  const response = await handleTavilyHotelEvidence(request(), "server-secret", {
    analysisCache: new Map(),
    inFlight: new Map(),
    logger: { info() {}, warn() {} },
    now: () => Date.parse("2026-09-12T08:00:00.000Z"),
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      assert.equal(init.headers.Authorization, "Bearer server-secret")
      assert.equal(JSON.parse(init.body).search_depth, "basic")
      return Response.json({
        results: [{
          title: "Hotel Eden review",
          url: "https://www.example.com/hotel-eden-review",
          content: longText,
          score: 0.91,
        }],
      })
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.ok(calls.length <= MAX_TAVILY_SEARCH_REQUESTS)
  assert.ok(calls.every((call) => call.url === TAVILY_SEARCH_ENDPOINT))
  assert.deepEqual(payload.evidence[0], {
    source: "web",
    provider: "tavily",
    domain: "example.com",
    title: "Hotel Eden review",
    text: longText,
    sourceUrl: "https://www.example.com/hotel-eden-review",
    retrievedAt: "2026-09-12T08:00:00.000Z",
    relevanceScore: 0.91,
  })
  assert.equal(payload.usage.extractOperations, 0)
})

test("selectively extracts no more than five highly relevant short results", async () => {
  let searchCalls = 0
  let extractCalls = 0
  const response = await handleTavilyHotelEvidence(request(), "server-secret", {
    analysisCache: new Map(),
    inFlight: new Map(),
    logger: { info() {}, warn() {} },
    fetchImpl: async (url, init) => {
      if (url === TAVILY_SEARCH_ENDPOINT) {
        searchCalls += 1
        return Response.json({ results: Array.from({ length: 3 }, (_, index) => ({
          title: `Result ${searchCalls}-${index}`,
          url: `https://source${searchCalls}-${index}.example/article`,
          content: "Short snippet",
          score: 0.9 - index * 0.01,
        })) })
      }
      assert.equal(url, TAVILY_EXTRACT_ENDPOINT)
      extractCalls += 1
      const urls = JSON.parse(init.body).urls
      assert.ok(urls.length <= MAX_TAVILY_EXTRACT_OPERATIONS)
      return Response.json({
        results: urls.map((sourceUrl) => ({ url: sourceUrl, raw_content: `Full evidence from ${sourceUrl}` })),
      })
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.ok(searchCalls <= MAX_TAVILY_SEARCH_REQUESTS)
  assert.equal(extractCalls, 1)
  assert.equal(payload.usage.extractOperations, MAX_TAVILY_EXTRACT_OPERATIONS)
  assert.ok(payload.evidence.some((item) => item.text.startsWith("Full evidence")))
})

test("retries a failed Search at most once and stays inside the five-request budget", async () => {
  let calls = 0
  const response = await handleTavilyHotelEvidence(
    request({
      hotel: canonicalHotel,
      preferences: [{ name: "quiet room", priority: "critical" }],
    }),
    "server-secret",
    {
      analysisCache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () => {
        calls += 1
        if (calls === 1) throw new TypeError("network unavailable")
        return Response.json({ results: [{
          title: "Guest review",
          url: "https://example.org/review",
          content: "Detailed review text. ".repeat(20),
          score: 0.88,
        }] })
      },
    },
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(calls, 2)
  assert.equal(payload.usage.retries, 1)
  assert.equal(payload.usage.searchRequests, 2)
  assert.ok(payload.usage.searchRequests <= MAX_TAVILY_SEARCH_REQUESTS)
})

test("caches a successful analysis for repeated hotel and preference input", async () => {
  const analysisCache = new Map()
  const inFlight = new Map()
  let calls = 0
  const options = {
    analysisCache,
    inFlight,
    logger: { info() {}, warn() {} },
    fetchImpl: async () => {
      calls += 1
      return Response.json({ results: [{
        title: "Independent review",
        url: "https://example.net/hotel",
        content: "Substantive evidence. ".repeat(20),
        score: 0.82,
      }] })
    },
  }
  const first = await handleTavilyHotelEvidence(request(), "server-secret", options)
  const second = await handleTavilyHotelEvidence(request(), "server-secret", options)

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  const firstPayload = await first.json()
  const secondPayload = await second.json()
  assert.equal(calls, firstPayload.queries.length)
  assert.equal(secondPayload.usage.searchRequests, 0)
  assert.equal(secondPayload.usage.cacheHits, 1)
})

test("expires cached evidence after seven days", async () => {
  const analysisCache = new Map()
  const inFlight = new Map()
  let currentTime = Date.parse("2026-09-12T08:00:00.000Z")
  let calls = 0
  const options = {
    analysisCache,
    inFlight,
    now: () => currentTime,
    logger: { info() {}, warn() {} },
    fetchImpl: async () => {
      calls += 1
      return Response.json({ results: [{
        title: "Independent review",
        url: "https://example.net/hotel",
        content: "Substantive evidence. ".repeat(20),
        score: 0.82,
      }] })
    },
  }

  await handleTavilyHotelEvidence(request(), "server-secret", options)
  const callsAfterFirstAnalysis = calls
  currentTime += 7 * 24 * 60 * 60 * 1000 - 1
  await handleTavilyHotelEvidence(request(), "server-secret", options)
  assert.equal(calls, callsAfterFirstAnalysis)

  currentTime += 2
  await handleTavilyHotelEvidence(request(), "server-secret", options)
  assert.ok(calls > callsAfterFirstAnalysis)
})

test("keeps Search snippets when optional Extract is unavailable", async () => {
  const response = await handleTavilyHotelEvidence(
    request({
      hotel: canonicalHotel,
      preferences: [{ name: "quiet room", priority: "critical" }],
    }),
    "server-secret",
    {
      analysisCache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async (url) => {
        if (url === TAVILY_SEARCH_ENDPOINT) {
          return Response.json({ results: [{
            title: "Short hotel note",
            url: "https://example.com/short-note",
            content: "Quiet at night",
            score: 0.92,
          }] })
        }
        return Response.json({ detail: "Rate limit reached" }, { status: 429 })
      },
    },
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.evidence[0].text, "Quiet at night")
  assert.equal(payload.usage.failedRequests, 2)
  assert.equal(payload.usage.retries, 1)
  assert.equal(payload.usage.extractOperations, 2)
})

test("maps invalid API key failures without exposing the key", async () => {
  const response = await handleTavilyHotelEvidence(
    request({
      hotel: canonicalHotel,
      preferences: [{ name: "quiet room", priority: "critical" }],
    }),
    "server-secret",
    {
      analysisCache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () => Response.json({ detail: "Invalid API key" }, { status: 401 }),
    },
  )

  assert.equal(response.status, 503)
  const payload = await response.json()
  assert.equal(payload.error.code, "tavily_invalid_api_key")
  assert.equal(JSON.stringify(payload).includes("server-secret"), false)
})
