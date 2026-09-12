export const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"
export const TAVILY_EXTRACT_ENDPOINT = "https://api.tavily.com/extract"
export const MAX_TAVILY_SEARCH_REQUESTS = 5
export const MAX_TAVILY_EXTRACT_OPERATIONS = 5
export const TAVILY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const MAX_CACHE_ENTRIES = 200
const MIN_SUBSTANTIVE_TEXT_LENGTH = 180
const MIN_EXTRACT_SCORE = 0.7
const sharedAnalysisCache = new Map()
const sharedInFlightAnalyses = new Map()

const PRIORITY_ORDER = {
  critical: 0,
  important: 1,
  nice_to_have: 2,
}

const QUERY_GROUPS = [
  {
    key: "room_comfort",
    hint: "guest reviews rooms",
    pattern: /quiet|noise|sound|room|bed|sleep|clean|air.?condition|view|floor|balcony|bathroom/i,
  },
  {
    key: "accessibility_logistics",
    hint: "accessibility facilities",
    pattern: /elevator|lift|accessib|wheelchair|step.?free|stairs|parking|transport|location|walk|airport/i,
  },
  {
    key: "connectivity",
    hint: "guest reviews connectivity",
    pattern: /wi.?fi|internet|connect|remote.?work|business|signal/i,
  },
  {
    key: "food_service",
    hint: "guest reviews dining",
    pattern: /breakfast|food|restaurant|dining|meal|vegan|vegetarian|gluten|service|staff|housekeeping/i,
  },
  {
    key: "facilities_experience",
    hint: "guest reviews facilities",
    pattern: /.*/,
  },
]

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function numberOrNull(value) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .trim()
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "")
  } catch {
    return ""
  }
}

function cleanQueryText(value) {
  return String(value || "")
    .replace(/["\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function priority(value) {
  const normalized = normalize(value).replace(/\s+/g, "_")
  if (normalized === "critical") return "critical"
  if (normalized === "important") return "important"
  return "nice_to_have"
}

function cacheKey(hotel, preferences) {
  const normalizedPreferences = preferences
    .map((item) => `${priority(item.priority)}:${normalize(item.name)}`)
    .sort()
  return [hotel.placeId || "", hotel.name, hotel.city, hotel.country, ...normalizedPreferences]
    .map(normalize)
    .join("|")
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
  await cache.set(key, { value, expiresAt: now + TAVILY_CACHE_TTL_MS })
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

export function generateTavilyQueries(hotel, preferences) {
  const groups = new Map()
  for (const item of preferences) {
    const name = cleanQueryText(item.name)
    if (!name) continue
    const group = QUERY_GROUPS.find((candidate) => candidate.pattern.test(name))
    const key = group?.key || "facilities_experience"
    const existing = groups.get(key) || { group, preferences: [] }
    existing.preferences.push({ name, priority: priority(item.priority) })
    groups.set(key, existing)
  }

  const identity = [hotel.name, hotel.city, hotel.country]
    .map(cleanQueryText)
    .filter(Boolean)
    .join(" ")
  return [...groups.values()]
    .sort((left, right) => {
      const leftPriority = Math.min(...left.preferences.map((item) => PRIORITY_ORDER[item.priority]))
      const rightPriority = Math.min(...right.preferences.map((item) => PRIORITY_ORDER[item.priority]))
      return leftPriority - rightPriority
    })
    .slice(0, MAX_TAVILY_SEARCH_REQUESTS)
    .map(({ group, preferences: groupedPreferences }) => {
      const labels = groupedPreferences
        .sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority])
        .map((item) => item.name)
      const prefix = `"${identity}" ${group?.hint || "guest reviews"}`
      const availableLength = Math.max(0, 390 - prefix.length)
      const details = labels.join(" ").slice(0, availableLength).trim()
      return `${prefix}${details ? ` ${details}` : ""}`
    })
}

function mapFailure(payload, response, operation) {
  const message = isRecord(payload) && typeof payload.detail === "string"
    ? payload.detail
    : isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "Tavily request failed"
  const normalized = normalize(message)
  const retryAfter = response.headers.get("Retry-After")
  if (response.status === 401 || response.status === 403 || /invalid.*api.*key|unauthorized/.test(normalized)) {
    return new TavilyEvidenceError(
      "tavily_invalid_api_key",
      "Tavily access is not configured correctly",
      503,
      false,
      retryAfter,
    )
  }
  if (response.status === 429 || response.status === 432 || response.status === 433 || /quota|rate.?limit|usage.?limit/.test(normalized)) {
    return new TavilyEvidenceError(
      "tavily_rate_limited",
      "Tavily evidence search is temporarily rate limited",
      429,
      true,
      retryAfter,
    )
  }
  if (response.status === 400 || response.status === 422) {
    return new TavilyEvidenceError(
      "tavily_bad_request",
      `Tavily rejected the ${operation} request`,
      400,
      false,
      retryAfter,
    )
  }
  return new TavilyEvidenceError(
    "tavily_unavailable",
    "Tavily evidence search is temporarily unavailable",
    502,
    response.status >= 500,
    retryAfter,
  )
}

export class TavilyEvidenceError extends Error {
  constructor(code, message, status = 502, retryable = false, retryAfter = null) {
    super(message)
    this.name = "TavilyEvidenceError"
    this.code = code
    this.status = status
    this.retryable = retryable
    this.retryAfter = retryAfter
  }
}

async function responseJson(response) {
  try {
    return await response.json()
  } catch {
    throw new TavilyEvidenceError(
      "tavily_malformed_response",
      "Tavily returned an unexpected response",
      502,
      false,
    )
  }
}

function canSpend(stats, operation, cost) {
  if (operation === "search") return stats.searchRequests + cost <= MAX_TAVILY_SEARCH_REQUESTS
  return stats.extractOperations + cost <= MAX_TAVILY_EXTRACT_OPERATIONS
}

async function tavilyPost({ endpoint, body, apiKey, fetchImpl, operation, operationCost, stats }) {
  let attempt = 0
  while (attempt < 2) {
    if (!canSpend(stats, operation, operationCost)) {
      throw new TavilyEvidenceError(
        "tavily_dev_limit_reached",
        `The Tavily development ${operation} limit has been reached for this hotel analysis`,
        429,
        false,
      )
    }
    if (operation === "search") stats.searchRequests += operationCost
    else {
      stats.extractRequests += 1
      stats.extractOperations += operationCost
    }

    let response
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
    } catch {
      const failure = new TavilyEvidenceError(
        "tavily_network_error",
        "A network error interrupted the Tavily request",
        502,
        true,
      )
      stats.failedRequests += 1
      if (attempt === 0 && canSpend(stats, operation, operationCost)) {
        stats.retries += 1
        attempt += 1
        continue
      }
      throw failure
    }

    let payload
    try {
      payload = await responseJson(response)
    } catch (error) {
      stats.failedRequests += 1
      throw error
    }
    if (!response.ok || (isRecord(payload) && (payload.error || payload.detail))) {
      const failure = mapFailure(payload, response, operation)
      stats.failedRequests += 1
      if (failure.retryable && attempt === 0 && canSpend(stats, operation, operationCost)) {
        stats.retries += 1
        attempt += 1
        continue
      }
      throw failure
    }
    if (!isRecord(payload)) {
      throw new TavilyEvidenceError(
        "tavily_malformed_response",
        "Tavily returned an unexpected response",
        502,
        false,
      )
    }
    return payload
  }
  throw new TavilyEvidenceError("tavily_unavailable", "Tavily evidence search is unavailable", 502)
}

function searchResults(payload) {
  if (!Array.isArray(payload.results)) {
    throw new TavilyEvidenceError(
      "tavily_malformed_response",
      "Tavily Search returned an unexpected response",
      502,
      false,
    )
  }
  return payload.results.filter(isRecord)
}

function extractResults(payload) {
  if (!Array.isArray(payload.results)) {
    throw new TavilyEvidenceError(
      "tavily_malformed_response",
      "Tavily Extract returned an unexpected response",
      502,
      false,
    )
  }
  return payload.results.filter(isRecord)
}

function normalizeSearchEvidence(result, retrievedAt) {
  const sourceUrl = stringOrNull(result.url)
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null
  const text = typeof result.content === "string" ? result.content : ""
  return {
    source: "web",
    provider: "tavily",
    domain: domainFromUrl(sourceUrl),
    title: stringOrNull(result.title),
    text,
    sourceUrl,
    retrievedAt,
    relevanceScore: numberOrNull(result.score),
  }
}

function deduplicateEvidence(evidence) {
  const seen = new Set()
  return evidence.filter((item) => {
    const key = item.sourceUrl.replace(/\/$/, "")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function createTavilyEvidenceService(options) {
  const apiKey = options.apiKey
  const fetchImpl = options.fetchImpl || fetch
  const logger = options.logger || console
  const analysisCache = options.analysisCache || sharedAnalysisCache
  const inFlight = options.inFlight || sharedInFlightAnalyses
  const now = options.now || (() => Date.now())

  async function collectUncached(hotel, preferences) {
    const stats = {
      searchRequests: 0,
      extractRequests: 0,
      extractOperations: 0,
      cacheHits: 0,
      cacheMisses: 1,
      failedRequests: 0,
      retries: 0,
    }
    const queries = generateTavilyQueries(hotel, preferences)
    const retrievedAt = new Date(now()).toISOString()
    const evidence = []

    try {
      for (const query of queries) {
        const payload = await tavilyPost({
          endpoint: TAVILY_SEARCH_ENDPOINT,
          body: {
            query,
            topic: "general",
            search_depth: "basic",
            max_results: 5,
            include_answer: false,
            include_raw_content: false,
            include_images: false,
            auto_parameters: false,
            exclude_domains: ["facebook.com", "instagram.com", "pinterest.com", "tiktok.com"],
          },
          apiKey,
          fetchImpl,
          operation: "search",
          operationCost: 1,
          stats,
        })
        for (const result of searchResults(payload)) {
          const normalized = normalizeSearchEvidence(result, retrievedAt)
          if (normalized) evidence.push(normalized)
        }
      }

      const uniqueEvidence = deduplicateEvidence(evidence)
      const extractCandidates = uniqueEvidence
        .filter((item) =>
          item.text.trim().length < MIN_SUBSTANTIVE_TEXT_LENGTH &&
          (item.relevanceScore ?? 0) >= MIN_EXTRACT_SCORE,
        )
        .sort((left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0))
        .slice(0, MAX_TAVILY_EXTRACT_OPERATIONS)

      if (extractCandidates.length > 0) {
        try {
          const payload = await tavilyPost({
            endpoint: TAVILY_EXTRACT_ENDPOINT,
            body: {
              urls: extractCandidates.map((item) => item.sourceUrl),
              extract_depth: "basic",
              format: "text",
              include_images: false,
            },
            apiKey,
            fetchImpl,
            operation: "extract",
            operationCost: extractCandidates.length,
            stats,
          })
          const extractedByUrl = new Map(
            extractResults(payload).map((item) => [
              stringOrNull(item.url),
              typeof item.raw_content === "string" ? item.raw_content : "",
            ]),
          )
          for (const item of extractCandidates) {
            const extracted = extractedByUrl.get(item.sourceUrl)
            if (extracted?.trim()) item.text = extracted
          }
        } catch (error) {
          logger.warn?.("[tavily] selective extract skipped", {
            failureType: error instanceof TavilyEvidenceError ? error.code : "tavily_unavailable",
            hotel: hotel.name,
            extractCandidateCount: extractCandidates.length,
            ...stats,
          })
        }
      }

      const substantiveEvidence = uniqueEvidence.filter((item) =>
        item.text.trim().length > 0 &&
        (item.relevanceScore === null || item.relevanceScore >= 0.45),
      )
      const result = {
        hotel: safeHotel(hotel),
        queries,
        evidenceRetrieved: substantiveEvidence.length,
        evidence: substantiveEvidence,
      }
      logger.info?.("[tavily] hotel evidence", {
        outcome: substantiveEvidence.length > 0 ? "success" : "no_evidence",
        hotel: result.hotel.name,
        queryCount: queries.length,
        evidenceRetrieved: result.evidenceRetrieved,
        ...stats,
      })
      return { result, stats }
    } catch (error) {
      logger.warn?.("[tavily] hotel evidence failed", {
        failureType: error instanceof TavilyEvidenceError ? error.code : "tavily_unavailable",
        hotel: hotel.name,
        queryCount: queries.length,
        ...stats,
      })
      throw error
    }
  }

  async function collectEvidence(hotelInput, preferenceInput) {
    const hotel = safeHotel(hotelInput)
    const preferences = preferenceInput.map((item) => ({
      name: cleanQueryText(item.name),
      priority: priority(item.priority),
    }))
    const key = cacheKey(hotel, preferences)
    const cached = await readCache(analysisCache, key, now())
    if (cached) {
      const usage = {
        searchRequests: 0,
        extractRequests: 0,
        extractOperations: 0,
        cacheHits: 1,
        cacheMisses: 0,
        failedRequests: 0,
        retries: 0,
      }
      logger.info?.("[tavily] hotel evidence", {
        outcome: "cache_hit",
        hotel: hotel.name,
        queryCount: cached.queries.length,
        evidenceRetrieved: cached.evidenceRetrieved,
        ...usage,
      })
      return { ...cached, usage }
    }
    if (inFlight.has(key)) return inFlight.get(key)

    const request = collectUncached(hotel, preferences)
      .then(async ({ result, stats }) => {
        await writeCache(analysisCache, key, result, now())
        return { ...result, usage: stats }
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
    return request
  }

  return { collectEvidence }
}
