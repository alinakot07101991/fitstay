import {
  createGroqAnalysisService,
  GroqAnalysisError,
  normalizePreferencePriority,
} from "./groq-analysis-service.js"

export const MAX_GROQ_ANALYSIS_REQUEST_BYTES = 2 * 1024 * 1024

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

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function trimmedString(value, maximum) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximum)
    : null
}

function validPriority(value) {
  const normalized = String(value || "")
    .toLocaleLowerCase()
    .replace(/[-\s]+/g, "_")
  return ["critical", "important", "nice_to_have"].includes(normalized)
}

function validateInput(raw) {
  if (!isRecord(raw) || !isRecord(raw.hotel)) return null
  const hotel = {
    source: "google_places",
    placeId: trimmedString(raw.hotel.placeId, 300),
    name: trimmedString(raw.hotel.name, 300),
    city: trimmedString(raw.hotel.city, 120),
    country: trimmedString(raw.hotel.country, 120),
  }
  if (!hotel.name || !hotel.city || !hotel.country) return null
  if (
    !Array.isArray(raw.preferences) ||
    raw.preferences.length === 0 ||
    raw.preferences.length > 50
  ) {
    return null
  }
  const preferenceIds = new Set()
  const preferences = []
  for (const item of raw.preferences) {
    if (!isRecord(item) || !validPriority(item.priority)) return null
    const id = trimmedString(item.id, 120)
    const label = trimmedString(item.label || item.name, 300)
    if (!id || !label || preferenceIds.has(id)) return null
    preferenceIds.add(id)
    preferences.push({
      id,
      label,
      priority: normalizePreferencePriority(item.priority),
    })
  }
  if (!Array.isArray(raw.evidence) || raw.evidence.length > 2_000) return null
  const providerErrors = []
  if (raw.providerErrors !== undefined) {
    if (!Array.isArray(raw.providerErrors) || raw.providerErrors.length > 20) {
      return null
    }
    for (const error of raw.providerErrors) {
      if (!isRecord(error)) return null
      const provider = trimmedString(error.provider, 100)
      const code = trimmedString(error.code, 150)
      const message = trimmedString(error.message, 500)
      if (!provider || !code || !message) return null
      providerErrors.push({ provider, code, message })
    }
  }
  return { hotel, preferences, evidence: raw.evidence, providerErrors }
}

function errorResponse(error) {
  if (!(error instanceof GroqAnalysisError)) {
    return json(
      {
        status: "error",
        error: {
          code: "GROQ_PROVIDER_ERROR",
          message: "The hotel analysis could not be completed",
        },
      },
      502,
    )
  }
  return json(
    {
      status: "error",
      error: { code: error.code, message: error.message },
    },
    error.status,
    error.retryAfter ? { "Retry-After": error.retryAfter } : {},
  )
}

export async function handleGroqHotelAnalysis(request, apiKey, options = {}) {
  if (request.method !== "POST") {
    return json(
      {
        status: "error",
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
      },
      405,
      { Allow: "POST" },
    )
  }
  if (!apiKey) {
    return json(
      {
        status: "error",
        error: {
          code: "GROQ_NOT_CONFIGURED",
          message: "Hotel analysis is not configured yet",
        },
      },
      503,
    )
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0)
  if (contentLength > MAX_GROQ_ANALYSIS_REQUEST_BYTES) {
    return json(
      {
        status: "error",
        error: {
          code: "GROQ_INPUT_TOO_LARGE",
          message: "The hotel evidence request is too large",
        },
      },
      413,
    )
  }

  let raw
  try {
    const body = await request.text()
    if (
      new TextEncoder().encode(body).byteLength >
      MAX_GROQ_ANALYSIS_REQUEST_BYTES
    ) {
      return json(
        {
          status: "error",
          error: {
            code: "GROQ_INPUT_TOO_LARGE",
            message: "The hotel evidence request is too large",
          },
        },
        413,
      )
    }
    raw = JSON.parse(body)
  } catch {
    return json(
      {
        status: "error",
        error: {
          code: "INVALID_JSON",
          message: "A valid JSON body is required",
        },
      },
      400,
    )
  }
  const input = validateInput(raw)
  if (!input) {
    return json(
      {
        status: "error",
        error: {
          code: "INVALID_HOTEL_ANALYSIS_REQUEST",
          message:
            "Provide a canonical hotel, preferences and normalized evidence",
        },
      },
      400,
    )
  }

  const service = createGroqAnalysisService({
    apiKey,
    model: options.model,
    maxEvidenceItems: options.maxEvidenceItems,
    maxBatches: options.maxBatches,
    dailyAnalysisLimit: options.dailyAnalysisLimit,
    fetchImpl: options.fetchImpl,
    cache: options.cache,
    inFlight: options.inFlight,
    usageStore: options.usageStore,
    logger: options.logger,
    now: options.now,
    sleep: options.sleep,
  })
  try {
    return json({
      status: "success",
      ...(await service.analyzeHotelPreferences(input)),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
