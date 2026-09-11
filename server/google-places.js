import {
  createGooglePlacesService,
  GooglePlacesServiceError,
} from "./google-places-service.js"

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

function errorResponse(error) {
  if (!(error instanceof GooglePlacesServiceError)) {
    return json(
      {
        error: {
          code: "google_places_unavailable",
          message: "Google Places is temporarily unavailable",
        },
      },
      502,
    )
  }
  const headers = error.retryAfter ? { "Retry-After": error.retryAfter } : {}
  const payload = { error: { code: error.code, message: error.message } }
  if (error.code === "ambiguous_hotel") payload.candidates = error.candidates
  return json(payload, error.status, headers)
}

export async function handleGooglePlacesHotelResolution(
  request,
  apiKey,
  options = {},
) {
  if (request.method !== "POST") {
    return json(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      {
        Allow: "POST",
      },
    )
  }
  if (!apiKey) {
    return json(
      {
        error: {
          code: "google_places_not_configured",
          message: "Google Places hotel identification is not configured yet",
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
        error: {
          code: "invalid_json",
          message: "A valid JSON body is required",
        },
      },
      400,
    )
  }
  const hotelName =
    typeof input?.hotelName === "string" ? input.hotelName.trim() : ""
  const city = typeof input?.city === "string" ? input.city.trim() : ""
  const country = typeof input?.country === "string" ? input.country.trim() : ""
  if (
    !hotelName ||
    !city ||
    !country ||
    hotelName.length > 500 ||
    city.length > 120 ||
    country.length > 120
  ) {
    return json(
      {
        error: {
          code: "invalid_hotel_query",
          message: "Provide a hotel name, city, and country",
        },
      },
      400,
    )
  }

  const service = createGooglePlacesService({
    apiKey,
    fetchImpl: options.fetchImpl,
    logger: options.logger,
    cache: options.cache,
    inFlight: options.inFlight,
    now: options.now,
  })
  try {
    const hotel = await service.resolveHotel(hotelName, city, country)
    return json({ hotel })
  } catch (error) {
    return errorResponse(error)
  }
}
