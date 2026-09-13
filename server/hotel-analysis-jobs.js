const JOB_STAGES = [
  "hotel_information",
  "guest_feedback",
  "preference_matching",
  "score_calculation",
  "preparing_result",
]
const STALE_JOB_MS = 15 * 60 * 1000

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  })
}

function safeParse(value, fallback = null) {
  try {
    return typeof value === "string" ? JSON.parse(value) : (value ?? fallback)
  } catch {
    return fallback
  }
}

function publicJob(row) {
  if (!row) return null
  return {
    jobId: row.id,
    status: row.status,
    stage: row.stage,
    result: safeParse(row.result_json),
    error:
      row.error_code || row.error_message
        ? {
            code: row.error_code || "HOTEL_ANALYSIS_FAILED",
            message:
              row.error_message || "The hotel analysis could not be completed",
          }
        : null,
    updatedAt: row.updated_at,
  }
}

function resultNeedsMoreEvidence(result) {
  if (!result || !Array.isArray(result.preferences)) return true
  const weights = { critical: 2, important: 2, nice_to_have: 1 }
  const evaluated = result.preferences.filter((preference) => {
    if (["mixed", "insufficient_evidence"].includes(preference.status))
      return false
    if (preference.confidence === "low") return false
    return (
      preference.priority !== "critical" || preference.confidence === "high"
    )
  })
  const availableWeight = result.preferences.reduce(
    (total, preference) => total + (weights[preference.priority] || 0),
    0,
  )
  const evaluatedWeight = evaluated.reduce(
    (total, preference) => total + (weights[preference.priority] || 0),
    0,
  )
  const coverage = availableWeight ? evaluatedWeight / availableWeight : 0
  return result.matchScore === null || evaluated.length < 3 || coverage < 0.5
}

function validateInput(input) {
  const hotel = input?.hotel
  const preferences = input?.preferences
  if (
    !hotel ||
    hotel.source !== "google_places" ||
    typeof hotel.name !== "string" ||
    !hotel.name.trim() ||
    typeof hotel.city !== "string" ||
    !hotel.city.trim() ||
    typeof hotel.country !== "string" ||
    !hotel.country.trim() ||
    !Array.isArray(preferences) ||
    preferences.length === 0 ||
    preferences.length > 50
  )
    return null

  const normalizedPreferences = preferences
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id.trim() : "",
      label: typeof item?.label === "string" ? item.label.trim() : "",
      priority: item?.priority,
    }))
    .filter(
      (item) =>
        item.id &&
        item.label &&
        ["critical", "important", "nice_to_have"].includes(item.priority),
    )
  if (normalizedPreferences.length !== preferences.length) return null

  return {
    hotel: {
      source: "google_places",
      placeId:
        typeof hotel.placeId === "string" && hotel.placeId.trim()
          ? hotel.placeId.trim()
          : null,
      name: hotel.name.trim().slice(0, 300),
      city: hotel.city.trim().slice(0, 120),
      country: hotel.country.trim().slice(0, 120),
    },
    preferences: normalizedPreferences,
  }
}

export function createMemoryHotelAnalysisJobStore() {
  const jobs = new Map()
  return {
    async create(row) {
      jobs.set(row.id, { ...row })
    },
    async get(id) {
      return jobs.get(id) || null
    },
    async update(id, changes) {
      const current = jobs.get(id)
      if (!current) return null
      const next = { ...current, ...changes }
      jobs.set(id, next)
      return next
    },
  }
}

export function createD1HotelAnalysisJobStore(database) {
  let ready
  const ensureReady = () => {
    ready ||= (async () => {
      await database
        .prepare(
          `CREATE TABLE IF NOT EXISTS hotel_analysis_jobs (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          stage TEXT NOT NULL,
          request_json TEXT NOT NULL,
          result_json TEXT,
          checkpoint_json TEXT,
          error_code TEXT,
          error_message TEXT,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        )`,
        )
        .run()
      const columns = await database
        .prepare("PRAGMA table_info(hotel_analysis_jobs)")
        .all()
      if (
        !(columns.results || []).some(
          (column) => column.name === "checkpoint_json",
        )
      )
        await database
          .prepare(
            "ALTER TABLE hotel_analysis_jobs ADD COLUMN checkpoint_json TEXT",
          )
          .run()
    })()
    return ready
  }
  return {
    async create(row) {
      await ensureReady()
      await database
        .prepare(
          `INSERT INTO hotel_analysis_jobs
            (id, status, stage, request_json, result_json, checkpoint_json,
             error_code, error_message, attempt_count, created_at, updated_at,
             completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          row.id,
          row.status,
          row.stage,
          row.request_json,
          row.result_json,
          row.checkpoint_json,
          row.error_code,
          row.error_message,
          row.attempt_count,
          row.created_at,
          row.updated_at,
          row.completed_at,
        )
        .run()
    },
    async get(id) {
      await ensureReady()
      return database
        .prepare("SELECT * FROM hotel_analysis_jobs WHERE id = ? LIMIT 1")
        .bind(id)
        .first()
    },
    async update(id, changes) {
      await ensureReady()
      const allowed = [
        "status",
        "stage",
        "result_json",
        "checkpoint_json",
        "error_code",
        "error_message",
        "attempt_count",
        "updated_at",
        "completed_at",
      ]
      const entries = Object.entries(changes).filter(([key]) =>
        allowed.includes(key),
      )
      if (!entries.length) return this.get(id)
      const setClause = entries.map(([key]) => `${key} = ?`).join(", ")
      await database
        .prepare(`UPDATE hotel_analysis_jobs SET ${setClause} WHERE id = ?`)
        .bind(...entries.map(([, value]) => value), id)
        .run()
      return this.get(id)
    },
  }
}

async function callHandler(path, body, handler) {
  const response = await handler(
    new Request(`https://fitstay.internal${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  )
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "An evidence provider is unavailable",
    )
    error.code = payload?.error?.code || "PROVIDER_ERROR"
    throw error
  }
  return payload
}

function providerError(provider, error) {
  return {
    provider,
    code: error?.code || `${provider}_unavailable`,
    message: error?.message || `${provider} evidence is unavailable`,
  }
}

function normalizeGoogleReviews(payload) {
  return (payload?.reviews || []).map((review, index) => ({
    evidenceId: review.sourceId || `google-hotels:${index}`,
    source: review.source,
    type: "review",
    sourceId: review.sourceId,
    title: review.title,
    text: review.text,
    author: review.author,
    publishedAt: review.publishedAt,
    sourceUrl: review.sourceUrl,
    metadata: {
      rating: review.rating,
      tripType: review.tripType,
      subratings: review.subratings,
    },
  }))
}

function normalizeTripadvisorReviews(payload) {
  return (payload?.reviews || []).map((review) => ({
    evidenceId: `tripadvisor:${review.sourceId}`,
    source: review.source,
    type: "review",
    sourceId: review.sourceId,
    title: review.title,
    text: review.text,
    publishedAt: review.publishedAt,
    sourceUrl: review.sourceUrl,
    metadata: {
      rating: review.rating,
      tripType: review.tripType,
      subratings: review.subratings,
    },
  }))
}

async function processJob(jobId, options) {
  const { store, handlers } = options
  const row = await store.get(jobId)
  if (!row || row.status !== "queued") return
  const input = safeParse(row.request_json)
  if (!input) return
  const savedCheckpoint = safeParse(row.checkpoint_json, {}) || {}
  const evidence = Array.isArray(savedCheckpoint.evidence)
    ? [...savedCheckpoint.evidence]
    : []
  const providerErrors = Array.isArray(savedCheckpoint.providerErrors)
    ? [...savedCheckpoint.providerErrors]
    : []
  const completedProviders = new Set(
    Array.isArray(savedCheckpoint.completedProviders)
      ? savedCheckpoint.completedProviders
      : [],
  )
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId))
  const addEvidence = (items) => {
    for (const item of items || []) {
      if (!item?.evidenceId || evidenceIds.has(item.evidenceId)) continue
      evidenceIds.add(item.evidenceId)
      evidence.push(item)
    }
  }
  const clearProviderError = (provider) => {
    for (let index = providerErrors.length - 1; index >= 0; index -= 1)
      if (providerErrors[index].provider === provider)
        providerErrors.splice(index, 1)
  }
  const setProviderError = (provider, error) => {
    clearProviderError(provider)
    providerErrors.push(providerError(provider, error))
  }
  const saveCheckpoint = () =>
    store.update(jobId, {
      checkpoint_json: JSON.stringify({
        evidence,
        providerErrors,
        completedProviders: [...completedProviders],
      }),
      updated_at: new Date().toISOString(),
    })

  if (evidence.length === 0)
    addEvidence([
      {
        evidenceId: `google-place:${input.hotel.placeId || input.hotel.name}`,
        source: "google_places",
        type: "hotel_information",
        sourceId: input.hotel.placeId,
        title: input.hotel.name,
        text: `${input.hotel.name}, ${input.hotel.city}, ${input.hotel.country}`,
      },
    ])

  const resumedStage =
    completedProviders.has("google_hotels") &&
    completedProviders.has("tripadvisor") &&
    completedProviders.has("youtube") &&
    completedProviders.has("web")
      ? "score_calculation"
      : completedProviders.has("google_hotels") &&
          completedProviders.has("tripadvisor")
        ? "preference_matching"
        : "guest_feedback"
  const now = new Date().toISOString()
  await store.update(jobId, {
    status: "processing",
    stage: resumedStage,
    attempt_count: Number(row.attempt_count || 0) + 1,
    updated_at: now,
    error_code: null,
    error_message: null,
  })

  try {
    const reviewProviders = [
      {
        provider: "google_hotels",
        run: () => handlers.googleReviews(input),
        normalize: normalizeGoogleReviews,
      },
      {
        provider: "tripadvisor",
        run: () => handlers.tripadvisorReviews(input),
        normalize: normalizeTripadvisorReviews,
      },
    ].filter(({ provider }) => !completedProviders.has(provider))

    if (reviewProviders.length > 0) {
      await store.update(jobId, {
        stage: "guest_feedback",
        updated_at: new Date().toISOString(),
      })
      const reviewResults = await Promise.allSettled(
        reviewProviders.map(({ run }) => run()),
      )
      reviewResults.forEach((result, index) => {
        const definition = reviewProviders[index]
        if (result.status === "fulfilled") {
          addEvidence(definition.normalize(result.value))
          clearProviderError(definition.provider)
          completedProviders.add(definition.provider)
        } else setProviderError(definition.provider, result.reason)
      })
      await saveCheckpoint()
    }

    const discoveryProviders = [
      {
        provider: "youtube",
        run: () => handlers.youtube(input),
      },
      {
        provider: "web",
        run: () => handlers.tavily(input),
      },
    ].filter(({ provider }) => !completedProviders.has(provider))

    if (discoveryProviders.length > 0) {
      await store.update(jobId, {
        stage: "preference_matching",
        updated_at: new Date().toISOString(),
      })
      const discoveryResults = await Promise.allSettled(
        discoveryProviders.map(({ run }) => run()),
      )
      discoveryResults.forEach((result, index) => {
        const { provider } = discoveryProviders[index]
        if (result.status === "rejected") {
          setProviderError(provider, result.reason)
          return
        }
        if (provider === "youtube") {
          addEvidence(result.value?.evidence || [])
          if (result.value?.providerError) {
            setProviderError("youtube", result.value.providerError)
            return
          }
        } else {
          addEvidence(
            (result.value?.evidence || []).map((item, itemIndex) => ({
              evidenceId: `web:${item.domain}:${itemIndex}`,
              source: item.source,
              provider: item.provider,
              type: "web",
              title: item.title,
              text: item.text,
              sourceUrl: item.sourceUrl,
              publishedAt: item.retrievedAt,
              domain: item.domain,
              metadata: { relevanceScore: item.relevanceScore },
            })),
          )
        }
        clearProviderError(provider)
        completedProviders.add(provider)
      })
      await saveCheckpoint()
    }

    await store.update(jobId, {
      stage: "score_calculation",
      updated_at: new Date().toISOString(),
    })
    const result = await handlers.groq({ ...input, evidence, providerErrors })
    await store.update(jobId, {
      stage: "preparing_result",
      updated_at: new Date().toISOString(),
    })
    await store.update(jobId, {
      status: "completed",
      result_json: JSON.stringify(result),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
  } catch (error) {
    await saveCheckpoint()
    await store.update(jobId, {
      status: "failed",
      error_code: error?.code || "HOTEL_ANALYSIS_FAILED",
      error_message:
        error?.message || "The hotel analysis could not be completed",
      updated_at: new Date().toISOString(),
    })
  }
}

export function createHotelAnalysisJobHandlers(configuration) {
  return {
    googleReviews: (input) =>
      callHandler(
        "/api/google-hotels/reviews",
        {
          hotelName: input.hotel.name,
          city: input.hotel.city,
          country: input.hotel.country,
        },
        (request) =>
          configuration.handleGoogleReviews(request, configuration.serpApiKey),
      ),
    tripadvisorReviews: (input) =>
      callHandler(
        "/api/tripadvisor/reviews",
        {
          hotelName: input.hotel.name,
          city: input.hotel.city,
          country: input.hotel.country,
        },
        (request) =>
          configuration.handleTripadvisorReviews(
            request,
            configuration.tripadvisorApiKey,
          ),
      ),
    youtube: (input) =>
      callHandler("/api/youtube/evidence", { hotel: input.hotel }, (request) =>
        configuration.handleYouTube(request, configuration.youtubeApiKey, {
          dailyLimit: configuration.youtubeDailyLimit,
          cache: configuration.youtubeCache,
          usageStore: configuration.youtubeUsageStore,
        }),
      ),
    tavily: (input) =>
      callHandler(
        "/api/tavily/evidence",
        {
          hotel: input.hotel,
          preferences: input.preferences.map((preference) => ({
            name: preference.label,
            priority: preference.priority,
          })),
        },
        (request) =>
          configuration.handleTavily(request, configuration.tavilyApiKey, {
            analysisCache: configuration.tavilyCache,
          }),
      ),
    groq: (input) =>
      callHandler("/api/hotel-analysis", input, (request) =>
        configuration.handleGroq(request, configuration.groqApiKey, {
          model: configuration.groqModel,
          maxEvidenceItems: configuration.groqMaxEvidenceItems,
          maxBatches: configuration.groqMaxBatches,
          dailyAnalysisLimit: configuration.groqDailyLimit,
          cache: configuration.groqCache,
          usageStore: configuration.groqUsageStore,
        }),
      ),
  }
}

export async function handleHotelAnalysisJobs(request, options) {
  const url = new URL(request.url)
  const match = url.pathname.match(
    /^\/api\/hotel-analysis\/jobs(?:\/([a-f0-9-]+))?(?:\/(retry))?$/i,
  )
  if (!match) return null
  const [, jobId, action] = match

  if (!jobId && request.method === "POST") {
    let input
    try {
      input = validateInput(await request.json())
    } catch {
      input = null
    }
    if (!input)
      return json(
        {
          error: {
            code: "INVALID_HOTEL_ANALYSIS_JOB",
            message: "Provide a canonical hotel and at least one preference",
          },
        },
        400,
      )
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await options.store.create({
      id,
      status: "queued",
      stage: JOB_STAGES[0],
      request_json: JSON.stringify(input),
      result_json: null,
      checkpoint_json: null,
      error_code: null,
      error_message: null,
      attempt_count: 0,
      created_at: now,
      updated_at: now,
      completed_at: null,
    })
    const task = processJob(id, options)
    options.waitUntil?.(task)
    if (!options.waitUntil) void task
    return json(publicJob(await options.store.get(id)), 202)
  }

  if (jobId && !action && request.method === "GET") {
    let job = await options.store.get(jobId)
    if (
      job &&
      ["queued", "processing"].includes(job.status) &&
      Date.now() - new Date(job.updated_at).getTime() > STALE_JOB_MS
    ) {
      job = await options.store.update(jobId, {
        status: "failed",
        error_code: "HOTEL_ANALYSIS_INTERRUPTED",
        error_message:
          "The previous analysis was interrupted. You can start it again",
        updated_at: new Date().toISOString(),
      })
    }
    return job
      ? json(publicJob(job))
      : json(
          {
            error: {
              code: "HOTEL_ANALYSIS_JOB_NOT_FOUND",
              message: "This hotel analysis could not be found",
            },
          },
          404,
        )
  }

  if (jobId && action === "retry" && request.method === "POST") {
    const job = await options.store.get(jobId)
    if (!job)
      return json(
        {
          error: {
            code: "HOTEL_ANALYSIS_JOB_NOT_FOUND",
            message: "This hotel analysis could not be found",
          },
        },
        404,
      )
    const completedResult = safeParse(job.result_json)
    const canRetryCompletedResult =
      job.status === "completed" && resultNeedsMoreEvidence(completedResult)
    if (job.status !== "failed" && !canRetryCompletedResult)
      return json(publicJob(job), 200)
    await options.store.update(jobId, {
      status: "queued",
      result_json: null,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
      completed_at: null,
    })
    const task = processJob(jobId, options)
    options.waitUntil?.(task)
    if (!options.waitUntil) void task
    return json(publicJob(await options.store.get(jobId)), 202)
  }

  return json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    405,
    { Allow: jobId ? "GET, POST" : "POST" },
  )
}
