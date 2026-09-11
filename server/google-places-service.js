export const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT =
  "https://places.googleapis.com/v1/places:searchText"
export const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.primaryType",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
].join(",")

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 500
const sharedResolutionCache = new Map()
const sharedInFlightResolutions = new Map()
const LODGING_TYPES = new Set([
  "bed_and_breakfast",
  "budget_japanese_inn",
  "extended_stay_hotel",
  "guest_house",
  "hostel",
  "hotel",
  "inn",
  "japanese_inn",
  "lodging",
  "motel",
  "private_guest_room",
  "resort_hotel",
])

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

function displayName(place) {
  if (typeof place.displayName === "string") return place.displayName
  if (isRecord(place.displayName)) return stringOrNull(place.displayName.text)
  return null
}

function addressComponent(place, preferredTypes) {
  if (!Array.isArray(place.addressComponents)) return null
  for (const type of preferredTypes) {
    const component = place.addressComponents.find(
      (item) =>
        isRecord(item) &&
        Array.isArray(item.types) &&
        item.types.includes(type),
    )
    if (component)
      return (
        stringOrNull(component.longText) || stringOrNull(component.shortText)
      )
  }
  return null
}

export function normalizeGooglePlace(place) {
  const location = isRecord(place.location) ? place.location : {}
  return {
    source: "google_places",
    placeId: stringOrNull(place.id) || "",
    name: displayName(place) || "",
    formattedAddress: stringOrNull(place.formattedAddress),
    city: addressComponent(place, [
      "locality",
      "postal_town",
      "administrative_area_level_3",
      "administrative_area_level_2",
      "administrative_area_level_1",
    ]),
    country: addressComponent(place, ["country"]),
    latitude: numberOrNull(location.latitude),
    longitude: numberOrNull(location.longitude),
    rating: numberOrNull(place.rating),
    reviewCount: numberOrNull(place.userRatingCount),
    googleMapsUrl: stringOrNull(place.googleMapsUri),
    primaryType: stringOrNull(place.primaryType),
  }
}

function publicHotel(candidate) {
  const { primaryType: _primaryType, ...hotel } = candidate
  return hotel
}

function nameSimilarity(requestedName, candidateName) {
  const requested = normalizeForMatch(requestedName)
  const candidate = normalizeForMatch(candidateName)
  if (!requested || !candidate) return 0
  if (requested === candidate) return 1
  if (candidate.includes(requested)) return 0.9
  if (requested.includes(candidate)) return 0.85

  const requestedTokens = new Set(requested.split(" ").filter(Boolean))
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean))
  const shared = [...requestedTokens].filter((token) =>
    candidateTokens.has(token),
  ).length
  return shared / Math.max(requestedTokens.size, candidateTokens.size, 1)
}

function locationMatch(candidate, requested, field) {
  const normalizedRequested = normalizeForMatch(requested)
  if (!normalizedRequested) return true
  const direct = normalizeForMatch(candidate[field])
  if (direct) {
    return (
      direct === normalizedRequested ||
      direct.includes(normalizedRequested) ||
      normalizedRequested.includes(direct)
    )
  }
  const address = normalizeForMatch(candidate.formattedAddress)
  return address ? address.includes(normalizedRequested) : null
}

function rankCandidates(candidates, hotelName, city, country) {
  return candidates
    .filter((candidate) => candidate.placeId && candidate.name)
    .map((candidate) => {
      const similarity = nameSimilarity(hotelName, candidate.name)
      const cityMatches = locationMatch(candidate, city, "city")
      const countryMatches = locationMatch(candidate, country, "country")
      const lodging = candidate.primaryType
        ? LODGING_TYPES.has(candidate.primaryType)
        : false
      return { candidate, similarity, cityMatches, countryMatches, lodging }
    })
    .sort((left, right) => right.similarity - left.similarity)
}

export class GooglePlacesServiceError extends Error {
  constructor(code, message, status = 502, candidates = [], retryAfter = null) {
    super(message)
    this.name = "GooglePlacesServiceError"
    this.code = code
    this.status = status
    this.candidates = candidates
    this.retryAfter = retryAfter
  }
}

function apiFailure(payload, response) {
  const upstream = isRecord(payload?.error) ? payload.error : {}
  const message =
    stringOrNull(upstream.message) || "Google Places request failed"
  const googleStatus = stringOrNull(upstream.status) || ""
  const normalized = normalizeForMatch(`${googleStatus} ${message}`)
  const retryAfter = response.headers.get("Retry-After")

  if (/api key.*not valid|invalid.*api key|api key.*invalid/.test(normalized)) {
    return new GooglePlacesServiceError(
      "google_places_invalid_api_key",
      "Google Places access is not configured correctly",
      503,
    )
  }
  if (
    /billing.*disabled|billing.*not enabled|billing account/.test(normalized)
  ) {
    return new GooglePlacesServiceError(
      "google_places_billing_disabled",
      "Google Places billing is not enabled for this project",
      503,
    )
  }
  if (
    response.status === 429 ||
    googleStatus === "RESOURCE_EXHAUSTED" ||
    /quota.*exceed/.test(normalized)
  ) {
    const rateLimited = /rate limit|requests per minute|too many requests/.test(
      normalized,
    )
    return new GooglePlacesServiceError(
      rateLimited
        ? "google_places_rate_limited"
        : "google_places_quota_exceeded",
      rateLimited
        ? "Google Places is temporarily rate limited. Please try again later"
        : "The Google Places quota has been exceeded",
      429,
      [],
      retryAfter,
    )
  }
  if (response.status === 400 || googleStatus === "INVALID_ARGUMENT") {
    return new GooglePlacesServiceError(
      "google_places_bad_request",
      "Google Places rejected the hotel request",
      400,
    )
  }
  return new GooglePlacesServiceError(
    "google_places_unavailable",
    "Google Places is temporarily unavailable",
    502,
  )
}

function cacheKey(hotelName, city, country) {
  return [hotelName, city, country].map(normalizeForMatch).join("|")
}

function readCache(cache, key, now) {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= now) {
    cache.delete(key)
    return null
  }
  return entry.hotel
}

function writeCache(cache, key, hotel, now) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  cache.set(key, { hotel, expiresAt: now + CACHE_TTL_MS })
}

export function createGooglePlacesService(options) {
  const apiKey = options.apiKey
  const fetchImpl = options.fetchImpl || fetch
  const logger = options.logger || console
  const cache = options.cache || sharedResolutionCache
  const inFlight = options.inFlight || sharedInFlightResolutions
  const now = options.now || (() => Date.now())

  async function searchHotel(query) {
    let response
    try {
      response = await fetchImpl(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: "en",
          rankPreference: "RELEVANCE",
          pageSize: 10,
        }),
      })
    } catch {
      logger.warn?.("[google-places] lookup failed", {
        failureType: "network_error",
      })
      throw new GooglePlacesServiceError(
        "google_places_network_error",
        "A network error interrupted the Google Places request",
        502,
      )
    }

    let payload
    try {
      payload = await response.json()
    } catch {
      logger.warn?.("[google-places] lookup failed", {
        failureType: "malformed_response",
      })
      throw new GooglePlacesServiceError(
        "google_places_malformed_response",
        "Google Places returned an unexpected response",
        502,
      )
    }
    if (!response.ok || isRecord(payload?.error)) {
      const failure = apiFailure(payload, response)
      logger.warn?.("[google-places] lookup failed", {
        failureType: failure.code,
      })
      throw failure
    }
    if (
      !isRecord(payload) ||
      (payload.places !== undefined && !Array.isArray(payload.places))
    ) {
      logger.warn?.("[google-places] lookup failed", {
        failureType: "malformed_response",
      })
      throw new GooglePlacesServiceError(
        "google_places_malformed_response",
        "Google Places returned an unexpected response",
        502,
      )
    }

    const candidates = (Array.isArray(payload.places) ? payload.places : [])
      .filter(isRecord)
      .map(normalizeGooglePlace)
    logger.info?.("[google-places] text search", {
      query,
      candidateCount: candidates.length,
    })
    return candidates
  }

  async function getHotelCandidates(hotelName, city, country) {
    const query = `${hotelName}, ${city}, ${country}`
    const candidates = await searchHotel(query)
    return rankCandidates(candidates, hotelName, city, country)
  }

  async function resolveUncached(hotelName, city, country) {
    const ranked = await getHotelCandidates(hotelName, city, country)
    const strong = ranked.filter(
      (result) =>
        result.lodging &&
        result.similarity >= 0.72 &&
        (result.cityMatches !== false ||
          (result.similarity === 1 && ranked.length === 1)) &&
        result.countryMatches !== false,
    )
    if (strong.length === 0) {
      const plausible = ranked.filter(
        (result) =>
          result.lodging &&
          result.similarity >= 0.45 &&
          result.countryMatches !== false,
      )
      if (plausible.length > 1) {
        throw new GooglePlacesServiceError(
          "ambiguous_hotel",
          "More than one Google place may match this hotel. Add a more specific name or location",
          409,
          plausible.slice(0, 10).map((result) => publicHotel(result.candidate)),
        )
      }
      throw new GooglePlacesServiceError(
        "hotel_not_found",
        "No matching hotel was found in Google Places",
        404,
      )
    }
    if (strong.length > 1) {
      throw new GooglePlacesServiceError(
        "ambiguous_hotel",
        "More than one Google place strongly matches this hotel",
        409,
        strong.slice(0, 10).map((result) => publicHotel(result.candidate)),
      )
    }

    const hotel = publicHotel(strong[0].candidate)
    logger.info?.("[google-places] hotel selected", {
      selectedHotel: hotel.name,
      placeId: hotel.placeId,
    })
    return hotel
  }

  async function resolveHotel(hotelName, city, country) {
    const key = cacheKey(hotelName, city, country)
    const cached = readCache(cache, key, now())
    if (cached) {
      logger.info?.("[google-places] cache hit", {
        query: `${hotelName}, ${city}, ${country}`,
        selectedHotel: cached.name,
        placeId: cached.placeId,
      })
      return cached
    }
    if (inFlight.has(key)) return inFlight.get(key)

    const resolution = resolveUncached(hotelName, city, country)
      .then((hotel) => {
        writeCache(cache, key, hotel, now())
        return hotel
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, resolution)
    return resolution
  }

  return { searchHotel, getHotelCandidates, resolveHotel }
}
