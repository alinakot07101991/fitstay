import { createTavilyEvidenceService, TavilyEvidenceError } from "./tavily-evidence-service.js"

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

function normalizePreferences(input) {
  if (Array.isArray(input)) return input
  if (!input || typeof input !== "object") return []
  const groups = [
    ["critical", input.critical],
    ["important", input.important],
    ["nice_to_have", input.niceToHave || input.nice_to_have],
  ]
  return groups.flatMap(([priority, values]) =>
    Array.isArray(values) ? values.map((name) => ({ name, priority })) : [],
  )
}

function validatedInput(input) {
  const sourceHotel = input?.hotel && typeof input.hotel === "object" ? input.hotel : {}
  const hotel = {
    source: "google_places",
    placeId: typeof sourceHotel.placeId === "string" ? sourceHotel.placeId.trim() : null,
    name: typeof sourceHotel.name === "string" ? sourceHotel.name.trim() : "",
    city: typeof sourceHotel.city === "string" ? sourceHotel.city.trim() : "",
    country: typeof sourceHotel.country === "string" ? sourceHotel.country.trim() : "",
  }
  const preferences = normalizePreferences(input?.preferences)
    .map((item) => ({
      name: typeof item === "string"
        ? item.trim()
        : typeof item?.name === "string"
          ? item.name.trim()
          : typeof item?.label === "string"
            ? item.label.trim()
            : "",
      priority: typeof item === "object" && typeof item?.priority === "string"
        ? item.priority
        : "nice_to_have",
    }))
    .filter((item) => item.name)

  if (
    !hotel.name ||
    !hotel.city ||
    !hotel.country ||
    hotel.name.length > 300 ||
    hotel.city.length > 120 ||
    hotel.country.length > 120 ||
    preferences.length === 0 ||
    preferences.length > 50 ||
    preferences.some((item) => item.name.length > 120)
  ) return null
  return { hotel, preferences }
}

function errorResponse(error) {
  if (!(error instanceof TavilyEvidenceError)) {
    return json({
      error: {
        code: "tavily_unavailable",
        message: "Tavily evidence search is temporarily unavailable",
      },
    }, 502)
  }
  return json(
    { error: { code: error.code, message: error.message } },
    error.status,
    error.retryAfter ? { "Retry-After": error.retryAfter } : {},
  )
}

export async function handleTavilyHotelEvidence(request, apiKey, options = {}) {
  if (request.method !== "POST") {
    return json({ error: { code: "method_not_allowed", message: "Method not allowed" } }, 405, {
      Allow: "POST",
    })
  }
  if (!apiKey) {
    return json({
      error: {
        code: "tavily_not_configured",
        message: "Tavily evidence search is not configured yet",
      },
    }, 503)
  }

  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: { code: "invalid_json", message: "A valid JSON body is required" } }, 400)
  }
  const validated = validatedInput(input)
  if (!validated) {
    return json({
      error: {
        code: "invalid_tavily_evidence_request",
        message: "Provide a canonical hotel with name, city and country, plus at least one preference",
      },
    }, 400)
  }

  const service = createTavilyEvidenceService({
    apiKey,
    fetchImpl: options.fetchImpl,
    logger: options.logger,
    analysisCache: options.analysisCache,
    inFlight: options.inFlight,
    now: options.now,
  })
  try {
    return json(await service.collectEvidence(validated.hotel, validated.preferences))
  } catch (error) {
    return errorResponse(error)
  }
}
