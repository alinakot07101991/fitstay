const SERPAPI_SEARCH_ENDPOINT = "https://serpapi.com/search.json"
const MAX_REVIEW_PAGES = 50

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  })
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function numberOrNull(value) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .trim()
}

function defaultStayDates(now = new Date()) {
  const checkIn = new Date(now)
  checkIn.setUTCDate(checkIn.getUTCDate() + 1)
  const checkOut = new Date(checkIn)
  checkOut.setUTCDate(checkOut.getUTCDate() + 1)
  return {
    check_in_date: checkIn.toISOString().slice(0, 10),
    check_out_date: checkOut.toISOString().slice(0, 10),
  }
}

function addressText(value) {
  if (typeof value === "string") return value
  if (!isRecord(value)) return null
  const direct = [value.address, value.formatted, value.full_address, value.address_string]
    .find((item) => typeof item === "string" && item.length > 0)
  if (direct) return direct
  const parts = [value.street, value.city, value.state, value.postal_code, value.country]
    .filter((item) => typeof item === "string" && item.length > 0)
  return parts.length > 0 ? parts.join(", ") : null
}

function propertyToken(property) {
  const value = property.property_token ?? property.propertyToken
  return value === null || value === undefined || value === "" ? null : String(value)
}

function summarizeProperty(property) {
  return {
    name: stringOrNull(property.name) || "Unknown hotel",
    location: addressText(property.address) || stringOrNull(property.location) || null,
    propertyToken: propertyToken(property),
  }
}

function searchProperties(payload) {
  if (!isRecord(payload)) return null
  if (payload.property_token || payload.propertyToken) return [payload]
  const groups = [payload.properties, payload.ads, payload.non_matching_properties]
  const availableGroups = groups.filter(Array.isArray)
  if (availableGroups.length === 0) {
    return null
  }
  return availableGroups.flat().filter(isRecord)
}

function chooseProperty(properties, hotelName) {
  const candidates = properties.map(summarizeProperty)
  if (candidates.length === 0) return { kind: "not_found", candidates: [] }

  const requested = normalizeForMatch(hotelName)
  const exact = candidates.filter((candidate) => normalizeForMatch(candidate.name) === requested)
  if (exact.length === 1) return { kind: "selected", hotel: exact[0] }
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact }

  const contained = candidates.filter((candidate) => {
    const name = normalizeForMatch(candidate.name)
    return name.includes(requested) || requested.includes(name)
  })
  if (contained.length === 1) return { kind: "selected", hotel: contained[0] }
  if (contained.length > 1) return { kind: "ambiguous", candidates: contained }
  if (candidates.length === 1) return { kind: "selected", hotel: candidates[0] }
  return { kind: "ambiguous", candidates }
}

function locationMatchesContext(location, city, country) {
  if (!location) return true
  const haystack = normalizeForMatch(location)
  const requested = [city, country].map(normalizeForMatch).filter(Boolean)
  if (requested.length === 0) return true
  return requested.some((part) => haystack.includes(part))
}

function subratingsOrNull(value) {
  if (isRecord(value)) return value
  if (!Array.isArray(value) || value.length === 0) return null
  return Object.fromEntries(value.map((item, index) => {
    if (!isRecord(item)) return [`subrating_${index + 1}`, item]
    const key = stringOrNull(item.name) || stringOrNull(item.type) || `subrating_${index + 1}`
    return [key, item.rating ?? item.value ?? item]
  }))
}

export function normalizeGoogleHotelsReview(review, hotelId) {
  const explicitId = review.review_id ?? review.reviewId ?? review.id
  const user = isRecord(review.user) ? review.user : {}
  const originalText = typeof review.snippet === "string"
    ? review.snippet
    : typeof review.text === "string"
      ? review.text
      : ""
  return {
    source: "google_hotels",
    sourceId: explicitId === null || explicitId === undefined ? null : String(explicitId),
    hotelId: String(hotelId),
    author: stringOrNull(review.author) || stringOrNull(user.name),
    rating: numberOrNull(review.rating),
    title: stringOrNull(review.title) || stringOrNull(review.headline),
    text: originalText,
    publishedAt: stringOrNull(review.published_at) || stringOrNull(review.date),
    tripType: stringOrNull(review.trip_type) || stringOrNull(review.travel_type),
    subratings: subratingsOrNull(review.subratings),
    sourceUrl: stringOrNull(review.link) || stringOrNull(review.url) || stringOrNull(user.link),
  }
}

function classifySerpApiError(message, status) {
  const normalized = normalizeForMatch(message)
  if (status === 401 || status === 403 || /invalid.*api key|api key.*invalid|api key.*not valid/.test(normalized)) {
    return { status: 503, code: "serpapi_invalid_api_key", message: "Google Hotels access is not configured correctly" }
  }
  if (status === 429 || /rate limit|quota|maximum searches|searches.*exhausted|run out.*search/.test(normalized)) {
    return { status: 429, code: "serpapi_rate_limited", message: "Google Hotels reviews are temporarily rate limited. Please try again later" }
  }
  if (status === 400) {
    return { status: 400, code: "serpapi_bad_request", message: "SerpApi rejected the hotel request" }
  }
  return { status: 502, code: "serpapi_unavailable", message: "Google Hotels reviews are temporarily unavailable" }
}

class SerpApiError extends Error {
  constructor(message, status, retryAfter = null) {
    super(message)
    this.name = "SerpApiError"
    this.status = status
    this.retryAfter = retryAfter
  }
}

class MalformedSerpApiResponseError extends Error {
  constructor() {
    super("Malformed SerpApi response")
    this.name = "MalformedSerpApiResponseError"
  }
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    throw new MalformedSerpApiResponseError()
  }
}

async function serpApiGet(params, apiKey, stats, fetchImpl) {
  const url = new URL(SERPAPI_SEARCH_ENDPOINT)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value))
  })
  url.searchParams.set("api_key", apiKey)
  stats.apiCalls += 1

  let response
  try {
    response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } })
  } catch {
    throw new SerpApiError("Network error", 0)
  }
  const payload = await parseJson(response)
  if (!response.ok) {
    const upstreamMessage = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "SerpApi request failed"
    throw new SerpApiError(upstreamMessage, response.status, response.headers.get("Retry-After"))
  }
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.length > 0) {
    throw new SerpApiError(payload.error, response.status)
  }
  if (!isRecord(payload)) throw new MalformedSerpApiResponseError()
  return payload
}

function safeCandidates(candidates) {
  return candidates.slice(0, 10).map((candidate) => ({
    name: candidate.name,
    location: candidate.location,
    propertyToken: candidate.propertyToken,
  }))
}

function errorResponse(error) {
  if (error instanceof MalformedSerpApiResponseError) {
    return json({
      error: {
        code: "serpapi_malformed_response",
        message: "Google Hotels returned an unexpected response",
      },
    }, 502)
  }
  if (error instanceof SerpApiError) {
    if (error.status === 0) {
      return json({
        error: {
          code: "serpapi_network_error",
          message: "A network error interrupted the Google Hotels request",
        },
      }, 502)
    }
    const mapped = classifySerpApiError(error.message, error.status)
    const headers = error.retryAfter ? { "Retry-After": error.retryAfter } : {}
    return json({ error: { code: mapped.code, message: mapped.message } }, mapped.status, headers)
  }
  return json({
    error: {
      code: "serpapi_network_error",
      message: "A network error interrupted the Google Hotels request",
    },
  }, 502)
}

export async function handleGoogleHotelsReviews(request, apiKey, options = {}) {
  const fetchImpl = options.fetchImpl || fetch
  const logger = options.logger || console
  const stats = { apiCalls: 0, reviewPagesRequested: 0, reviewsRetrieved: 0 }
  const log = (outcome, level = "info") => {
    const method = typeof logger[level] === "function" ? logger[level].bind(logger) : logger.info?.bind(logger)
    method?.("[serpapi] google hotels reviews", { outcome, ...stats })
  }

  if (request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Method not allowed" } }, 405, { Allow: "POST" })
  }
  if (!apiKey) {
    return json({
      error: {
        code: "serpapi_not_configured",
        message: "Google Hotels reviews are not configured yet",
      },
    }, 503)
  }

  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: { code: "invalid_json", message: "A valid JSON body is required" } }, 400)
  }
  const hotelName = typeof input?.hotelName === "string" ? input.hotelName.trim() : ""
  const city = typeof input?.city === "string" ? input.city.trim() : ""
  const country = typeof input?.country === "string" ? input.country.trim() : ""
  if (!hotelName || !city || !country || hotelName.length > 500 || city.length > 120 || country.length > 120) {
    return json({
      error: {
        code: "invalid_hotel_query",
        message: "Provide a hotel name, city, and country",
      },
    }, 400)
  }

  try {
    const query = `${hotelName}, ${city}, ${country}`
    const stayDates = defaultStayDates()
    const searchPayload = await serpApiGet({
      engine: "google_hotels",
      q: query,
      hl: "en",
      currency: "EUR",
      ...stayDates,
    }, apiKey, stats, fetchImpl)
    const properties = searchProperties(searchPayload)
    if (properties === null) throw new MalformedSerpApiResponseError()
    const choice = chooseProperty(properties, hotelName)
    if (choice.kind === "not_found") {
      log("hotel_not_found")
      return json({ error: { code: "hotel_not_found", message: "No matching Google hotel was found" } }, 404)
    }
    if (choice.kind === "ambiguous") {
      log("ambiguous_hotel")
      return json({
        error: {
          code: "ambiguous_hotel",
          message: "More than one Google hotel matches this request. Add a more specific name or location",
        },
        candidates: safeCandidates(choice.candidates),
      }, 409)
    }
    if (!choice.hotel.propertyToken) {
      log("missing_property_token")
      return json({
        error: {
          code: "missing_property_token",
          message: "Google Hotels did not return a property identifier for this hotel",
        },
      }, 422)
    }

    const directPropertyResult = propertyToken(searchPayload) === choice.hotel.propertyToken
    const detailsPayload = directPropertyResult
      ? searchPayload
      : await serpApiGet({
        engine: "google_hotels",
        q: query,
        property_token: choice.hotel.propertyToken,
        hl: "en",
        currency: "EUR",
        ...stayDates,
      }, apiKey, stats, fetchImpl)
    const detailsHotel = summarizeProperty(detailsPayload)
    const resolvedHotel = {
      name: detailsHotel.name === "Unknown hotel" ? choice.hotel.name : detailsHotel.name,
      location: detailsHotel.location || choice.hotel.location || `${city}, ${country}`,
      propertyToken: detailsHotel.propertyToken || choice.hotel.propertyToken,
    }
    if (!resolvedHotel.propertyToken) {
      log("missing_property_token")
      return json({
        error: {
          code: "missing_property_token",
          message: "Google Hotels did not return a property identifier for this hotel",
        },
      }, 422)
    }
    if (!locationMatchesContext(resolvedHotel.location, city, country)) {
      log("ambiguous_hotel")
      return json({
        error: {
          code: "ambiguous_hotel",
          message: "The Google hotel result does not clearly match the requested location",
        },
        candidates: safeCandidates([resolvedHotel]),
      }, 409)
    }
    log("hotel_found")

    const reviews = []
    const seenTokens = new Set()
    let nextPageToken = null
    for (let page = 1; page <= MAX_REVIEW_PAGES; page += 1) {
      stats.reviewPagesRequested += 1
      const reviewPayload = await serpApiGet({
        engine: "google_hotels_reviews",
        property_token: resolvedHotel.propertyToken,
        source_number: -1,
        hl: "en",
        next_page_token: nextPageToken,
      }, apiKey, stats, fetchImpl)
      if (!Array.isArray(reviewPayload.reviews)) {
        const validEmptyResult = page === 1 && (
          isRecord(reviewPayload.search_metadata) || isRecord(reviewPayload.search_parameters)
        )
        if (validEmptyResult) break
        throw new MalformedSerpApiResponseError()
      }
      reviewPayload.reviews.forEach((review) => {
        if (isRecord(review)) reviews.push(normalizeGoogleHotelsReview(review, resolvedHotel.propertyToken))
      })

      const pagination = isRecord(reviewPayload.serpapi_pagination)
        ? reviewPayload.serpapi_pagination
        : {}
      const token = stringOrNull(pagination.next_page_token)
      if (!token || seenTokens.has(token)) break
      seenTokens.add(token)
      nextPageToken = token
    }

    stats.reviewsRetrieved = reviews.length
    if (reviews.length === 0) {
      log("no_reviews")
      return json({ error: { code: "no_reviews", message: "No Google reviews were found for this hotel" } }, 404)
    }
    log("success")
    return json({ hotel: resolvedHotel, reviewsRetrieved: reviews.length, reviews })
  } catch (error) {
    log(error instanceof MalformedSerpApiResponseError ? "malformed_response" : "request_failure", "warn")
    return errorResponse(error)
  }
}
