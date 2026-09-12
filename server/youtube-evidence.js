import {
  createYouTubeEvidenceService,
  YouTubeEvidenceError,
} from "./youtube-evidence-service.js"

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  })
}

function validatedHotel(input) {
  const source = isObject(input?.hotel) ? input.hotel : input
  const hotel = {
    source: "google_places",
    placeId:
      typeof source?.placeId === "string" && source.placeId.trim()
        ? source.placeId.trim()
        : null,
    name: typeof source?.name === "string" ? source.name.trim() : "",
    city: typeof source?.city === "string" ? source.city.trim() : "",
    country: typeof source?.country === "string" ? source.country.trim() : "",
  }
  if (
    !hotel.name ||
    !hotel.city ||
    !hotel.country ||
    hotel.name.length > 300 ||
    hotel.city.length > 120 ||
    hotel.country.length > 120 ||
    (hotel.placeId && hotel.placeId.length > 300)
  )
    return null
  return hotel
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function errorResponse(error) {
  if (!(error instanceof YouTubeEvidenceError)) {
    return json(
      {
        provider: "youtube",
        providerStatus: "error",
        error: {
          code: "YOUTUBE_UNAVAILABLE",
          message: "YouTube evidence is temporarily unavailable",
        },
      },
      502,
    )
  }
  return json(
    {
      provider: "youtube",
      providerStatus: "error",
      error: { code: error.code, message: error.message },
    },
    error.status,
    error.retryAfter ? { "Retry-After": error.retryAfter } : {},
  )
}

export async function handleYouTubeHotelEvidence(
  request,
  apiKey,
  options = {},
) {
  if (request.method !== "POST") {
    return json(
      {
        provider: "youtube",
        providerStatus: "error",
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
      },
      405,
      { Allow: "POST" },
    )
  }
  if (!apiKey) {
    return json(
      {
        provider: "youtube",
        providerStatus: "error",
        error: {
          code: "YOUTUBE_NOT_CONFIGURED",
          message: "YouTube evidence is not configured yet",
        },
      },
      503,
    )
  }

  let input
  try {
    input = await request.json()
  } catch {
    return json(
      {
        provider: "youtube",
        providerStatus: "error",
        error: {
          code: "INVALID_JSON",
          message: "A valid JSON body is required",
        },
      },
      400,
    )
  }
  const hotel = validatedHotel(input)
  if (!hotel) {
    return json(
      {
        provider: "youtube",
        providerStatus: "error",
        error: {
          code: "INVALID_YOUTUBE_EVIDENCE_REQUEST",
          message: "Provide a canonical hotel with name, city and country",
        },
      },
      400,
    )
  }

  const service = createYouTubeEvidenceService({
    apiKey,
    dailyLimit: options.dailyLimit,
    fetchImpl: options.fetchImpl,
    logger: options.logger,
    cache: options.cache,
    inFlight: options.inFlight,
    usageStore: options.usageStore,
    now: options.now,
  })
  try {
    return json(await service.getHotelYouTubeEvidence(hotel))
  } catch (error) {
    return errorResponse(error)
  }
}
