const TRIPADVISOR_API_BASE = "https://terra.tripadvisor.com/api"
const REVIEW_PAGE_SIZE = 20
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

function asArray(value) {
  if (Array.isArray(value)) return value
  if (isRecord(value)) {
    if (Array.isArray(value.data)) return value.data
    if (Array.isArray(value.locations)) return value.locations
    if (Array.isArray(value.results)) return value.results
    if (Array.isArray(value.reviews)) return value.reviews
  }
  return []
}

function localizedValue(value) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const primary = value.find((item) => isRecord(item) && item.primary === true)
    const selected = primary || value[0]
    if (isRecord(selected) && typeof selected.value === "string") return selected.value
    if (typeof selected === "string") return selected
  }
  if (isRecord(value) && typeof value.value === "string") return value.value
  return null
}

function firstString(...values) {
  for (const value of values) {
    const selected = localizedValue(value)
    if (selected !== null) return selected
  }
  return null
}

function normalizeForMatch(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .trim()
}

function locationId(location) {
  const value = location.tripadvisor_id ?? location.tripadvisorId ?? location.location_id ?? location.id
  return value === null || value === undefined ? null : String(value)
}

function locationName(location) {
  return firstString(location.names, location.name, location.localized_name) || "Unknown hotel"
}

function locationAddress(location) {
  const addressSource = Array.isArray(location.addresses)
    ? location.addresses.find((item) => isRecord(item) && item.primary === true) || location.addresses[0]
    : location.addresses || location.address
  if (typeof addressSource === "string") return addressSource
  if (!isRecord(addressSource)) return null
  return firstString(
    addressSource.formatted,
    addressSource.full_address,
    addressSource.address_string,
    addressSource.value,
  )
}

function locationField(location, field) {
  const direct = firstString(location[field])
  if (direct) return direct
  const addressSource = Array.isArray(location.addresses)
    ? location.addresses.find((item) => isRecord(item) && item.primary === true) || location.addresses[0]
    : location.addresses || location.address
  if (!isRecord(addressSource)) return null
  if (field === "country") {
    return firstString(addressSource.country, addressSource.country_name, addressSource.country_code)
  }
  return firstString(addressSource[field])
}

function locationUrl(location) {
  if (typeof location.web_url === "string") return location.web_url
  if (typeof location.url === "string") return location.url
  if (isRecord(location.urls)) {
    const tripadvisor = location.urls.tripadvisor
    return firstString(
      tripadvisor?.main,
      tripadvisor?.value,
      tripadvisor,
      location.urls.web,
      location.urls.details,
    )
  }
  if (Array.isArray(location.urls)) {
    const tripadvisor = location.urls.find(
      (item) => isRecord(item) && String(item.type || "").toLocaleLowerCase().includes("tripadvisor"),
    )
    return firstString(tripadvisor?.value, tripadvisor?.url, location.urls)
  }
  return null
}

function summarizeLocation(location) {
  return {
    locationId: locationId(location),
    name: locationName(location),
    city: locationField(location, "city"),
    country: locationField(location, "country"),
    address: locationAddress(location),
    sourceUrl: locationUrl(location),
  }
}

function candidateMatchesContext(candidate, city, country) {
  const haystack = normalizeForMatch(
    [candidate.city, candidate.country, candidate.address].filter(Boolean).join(" "),
  )
  const requested = [city, country]
    .filter(Boolean)
    .map((value) => normalizeForMatch(value))
    .filter(Boolean)
  return requested.length > 0 && requested.every((value) => haystack.includes(value))
}

function chooseHotel(locations, hotelName, city, country) {
  const candidates = locations
    .map(summarizeLocation)
    .filter((candidate) => candidate.locationId)
  if (candidates.length === 0) return { kind: "not-found", candidates: [] }

  const requestedName = normalizeForMatch(hotelName)
  const exactNameMatches = candidates.filter(
    (candidate) => normalizeForMatch(candidate.name) === requestedName,
  )
  const namePool = exactNameMatches.length > 0 ? exactNameMatches : candidates
  const contextualMatches = namePool.filter((candidate) =>
    candidateMatchesContext(candidate, city, country),
  )

  if (contextualMatches.length === 1) return { kind: "selected", hotel: contextualMatches[0] }
  if (exactNameMatches.length === 1) return { kind: "selected", hotel: exactNameMatches[0] }
  if (candidates.length === 1) return { kind: "selected", hotel: candidates[0] }
  return { kind: "ambiguous", candidates: contextualMatches.length > 1 ? contextualMatches : namePool }
}

function numberOrNull(value) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function tripTypeOrNull(value) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const values = value
      .map((item) => firstString(item?.name, item?.value, item))
      .filter(Boolean)
    return values.length > 0 ? values.join(", ") : null
  }
  return isRecord(value) ? firstString(value.name, value.value, value.type) : null
}

function subratingsOrNull(value) {
  if (isRecord(value)) return value
  if (!Array.isArray(value) || value.length === 0) return null
  return Object.fromEntries(
    value.map((item, index) => {
      if (!isRecord(item)) return [`subrating_${index + 1}`, item]
      const key = firstString(item.type, item.type_name, item.name) || `subrating_${index + 1}`
      return [key, item.rating ?? item.value ?? item]
    }),
  )
}

function reviewUrl(review) {
  if (typeof review.url === "string") return review.url
  if (typeof review.web_url === "string") return review.web_url
  if (isRecord(review.urls)) {
    return firstString(review.urls.tripadvisor, review.urls.web, review.urls.details)
  }
  return null
}

export function normalizeTripadvisorReview(review, hotelId, page, index) {
  const sourceId = review.id ?? review.review_id ?? `${hotelId}:${page}:${index + 1}`
  const title = firstString(review.title, review.headline)
  const text = firstString(review.text, review.review_text, review.body) ?? ""
  return {
    source: "tripadvisor",
    sourceId: String(sourceId),
    hotelId: String(hotelId),
    title,
    text,
    rating: numberOrNull(review.rating ?? review.overall_rating ?? review.traveler_rating),
    publishedAt: firstString(
      review.publish_ts,
      review.published_at,
      review.published_date,
      review.publish_date,
      review.published,
    ),
    tripType: tripTypeOrNull(review.trip_type ?? review.trip_types ?? review.travel_type),
    subratings: subratingsOrNull(
      review.subratings ?? review.traveler_ratings?.subratings ?? review.ratings?.subratings,
    ),
    sourceUrl: reviewUrl(review),
  }
}

function paginationInfo(payload) {
  const pagination = isRecord(payload?.pagination) ? payload.pagination : {}
  const totalPages = numberOrNull(
    pagination.total_pages ?? pagination.totalPages ?? pagination.page_count ?? pagination.pageCount,
  )
  const currentPage = numberOrNull(pagination.page ?? pagination.current_page ?? pagination.currentPage)
  const hasNext =
    pagination.has_next === true ||
    pagination.hasNext === true ||
    Boolean(pagination.next_page ?? pagination.nextPage ?? pagination.next)
  return { totalPages, currentPage, hasNext }
}

function upstreamMessage(payload, fallback) {
  if (!isRecord(payload)) return fallback
  return firstString(payload.detail, payload.title, payload.message, payload.error) || fallback
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function tripadvisorGet(url, apiKey, stats, fetchImpl) {
  stats.apiCalls += 1
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
  })
  const payload = await parseJson(response)
  if (response.ok) return payload

  const error = new Error(upstreamMessage(payload, "Tripadvisor API request failed"))
  error.status = response.status
  error.retryAfter = response.headers.get("Retry-After")
  throw error
}

function errorResponse(error) {
  const status = typeof error?.status === "number" ? error.status : null
  if (status === 400) {
    return json(
      { error: { code: "tripadvisor_bad_request", message: "Tripadvisor rejected the hotel request" } },
      400,
    )
  }
  if (status === 404) {
    return json(
      { error: { code: "hotel_not_found", message: "The hotel could not be found on Tripadvisor" } },
      404,
    )
  }
  if (status === 429) {
    const headers = error.retryAfter ? { "Retry-After": error.retryAfter } : {}
    return json(
      {
        error: {
          code: "tripadvisor_rate_limited",
          message: "Tripadvisor is temporarily rate limited. Please try again later",
        },
      },
      429,
      headers,
    )
  }
  if (status === 401 || status === 403) {
    return json(
      {
        error: {
          code: "tripadvisor_auth_failed",
          message: "Tripadvisor access is not configured correctly",
        },
      },
      502,
    )
  }
  return json(
    {
      error: {
        code: "tripadvisor_unavailable",
        message: "Tripadvisor reviews are temporarily unavailable",
      },
    },
    502,
  )
}

export async function handleTripadvisorHotelReviews(request, apiKey, options = {}) {
  const logger = options.logger || console
  const fetchImpl = options.fetchImpl || fetch
  const stats = { apiCalls: 0, reviewsRetrieved: 0, pagesRequested: 0 }

  const logStats = (outcome) => {
    logger.info("[tripadvisor] review retrieval", { outcome, ...stats })
  }

  if (request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Method not allowed" } }, 405, {
      Allow: "POST",
    })
  }
  if (!apiKey) {
    return json(
      {
        error: {
          code: "tripadvisor_not_configured",
          message: "Tripadvisor reviews are not configured yet",
        },
      },
      503,
    )
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
  if (!hotelName || hotelName.length > 500 || city.length > 120 || country.length > 120) {
    return json(
      {
        error: {
          code: "invalid_hotel_query",
          message: "Provide a hotel name and optional city or country",
        },
      },
      400,
    )
  }

  try {
    const searchUrl = new URL(`${TRIPADVISOR_API_BASE}/locations/search`)
    searchUrl.searchParams.set("query", hotelName)
    searchUrl.searchParams.set("search_type", "NAME")
    searchUrl.searchParams.set("category", "HOTEL")
    searchUrl.searchParams.set("page", "1")
    searchUrl.searchParams.set("size", "20")
    const geoName = city || country
    if (geoName) searchUrl.searchParams.set("geo_name", geoName)

    const searchPayload = await tripadvisorGet(searchUrl, apiKey, stats, fetchImpl)
    const searchLocations = asArray(searchPayload).map((result) =>
      isRecord(result?.location) ? result.location : result,
    )
    const choice = chooseHotel(searchLocations, hotelName, city, country)
    if (choice.kind === "not-found") {
      logStats("hotel_not_found")
      return json(
        { error: { code: "hotel_not_found", message: "No matching Tripadvisor hotel was found" } },
        404,
      )
    }
    if (choice.kind === "ambiguous") {
      logStats("ambiguous_hotel")
      return json(
        {
          error: {
            code: "ambiguous_hotel",
            message: "More than one hotel matches this request. Add a city or country",
          },
          candidates: choice.candidates,
        },
        409,
      )
    }

    const hotel = choice.hotel
    const reviews = []
    const seenReviewIds = new Set()
    for (let page = 1; page <= MAX_REVIEW_PAGES; page += 1) {
      const reviewsUrl = new URL(
        `${TRIPADVISOR_API_BASE}/locations/${encodeURIComponent(hotel.locationId)}/reviews`,
      )
      reviewsUrl.searchParams.set("language", "primary")
      reviewsUrl.searchParams.set("page", String(page))
      reviewsUrl.searchParams.set("size", String(REVIEW_PAGE_SIZE))
      stats.pagesRequested += 1

      const reviewPayload = await tripadvisorGet(reviewsUrl, apiKey, stats, fetchImpl)
      const pageReviews = asArray(reviewPayload)
      pageReviews.forEach((review, index) => {
        const normalized = normalizeTripadvisorReview(review, hotel.locationId, page, index)
        if (seenReviewIds.has(normalized.sourceId)) return
        seenReviewIds.add(normalized.sourceId)
        reviews.push(normalized)
      })

      const pagination = paginationInfo(reviewPayload)
      const currentPage = pagination.currentPage || page
      const hasAnotherPage = pagination.totalPages !== null
        ? currentPage < pagination.totalPages
        : pagination.hasNext || pageReviews.length === REVIEW_PAGE_SIZE
      if (!hasAnotherPage || pageReviews.length === 0) break
    }

    stats.reviewsRetrieved = reviews.length
    logStats("success")
    return json({
      hotel,
      tripadvisorLocationId: hotel.locationId,
      totalReviews: reviews.length,
      reviews,
    })
  } catch (error) {
    logStats("api_error")
    return errorResponse(error)
  }
}
