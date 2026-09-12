import assert from "node:assert/strict"
import test from "node:test"

import {
  createMemoryHotelAnalysisJobStore,
  handleHotelAnalysisJobs,
} from "./hotel-analysis-jobs.js"

const input = {
  hotel: {
    source: "google_places",
    placeId: "place-1",
    name: "Test Hotel",
    city: "Rome",
    country: "Italy",
  },
  preferences: [{ id: "quiet", label: "Quiet room", priority: "critical" }],
}

function request(path, method = "GET", body) {
  return new Request(`https://fitstay.test${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function successfulHandlers() {
  return {
    googleReviews: async () => ({ reviews: [] }),
    tripadvisorReviews: async () => ({ reviews: [] }),
    youtube: async () => ({ evidence: [], providerError: null }),
    tavily: async () => ({ evidence: [] }),
    groq: async () => ({
      status: "success",
      hotelId: "place-1",
      matchScore: 75,
      hasCriticalConflict: false,
      overallConfidence: "low",
      preferences: [],
      evidenceStats: {
        totalEvidenceItems: 1,
        relevantEvidenceItems: 1,
        evidenceItemsAnalyzed: 1,
        independentSourceCount: 1,
        sourcesAnalyzed: ["google_places"],
      },
      cacheHit: false,
    }),
  }
}

test("creates a background job and stores its completed result", async () => {
  const store = createMemoryHotelAnalysisJobStore()
  const tasks = []
  const response = await handleHotelAnalysisJobs(
    request("/api/hotel-analysis/jobs", "POST", input),
    {
      store,
      handlers: successfulHandlers(),
      waitUntil: (promise) => tasks.push(promise),
    },
  )
  assert.equal(response.status, 202)
  const created = await response.json()
  assert.match(created.jobId, /^[a-f0-9-]+$/i)
  assert.equal(tasks.length, 1)

  await tasks[0]
  const status = await handleHotelAnalysisJobs(
    request(`/api/hotel-analysis/jobs/${created.jobId}`),
    { store, handlers: successfulHandlers() },
  )
  const completed = await status.json()
  assert.equal(completed.status, "completed")
  assert.equal(completed.stage, "preparing_result")
  assert.equal(completed.result.matchScore, 75)
})

test("stores a controlled failure and restarts the same job", async () => {
  const store = createMemoryHotelAnalysisJobStore()
  const tasks = []
  let shouldFail = true
  const handlers = successfulHandlers()
  handlers.groq = async () => {
    if (shouldFail) {
      const error = new Error("Model unavailable")
      error.code = "GROQ_MODEL_UNAVAILABLE"
      throw error
    }
    return successfulHandlers().groq()
  }

  const createResponse = await handleHotelAnalysisJobs(
    request("/api/hotel-analysis/jobs", "POST", input),
    { store, handlers, waitUntil: (promise) => tasks.push(promise) },
  )
  const created = await createResponse.json()
  await tasks.shift()
  const failed = await store.get(created.jobId)
  assert.equal(failed.status, "failed")
  assert.equal(failed.error_code, "GROQ_MODEL_UNAVAILABLE")

  shouldFail = false
  const retryResponse = await handleHotelAnalysisJobs(
    request(`/api/hotel-analysis/jobs/${created.jobId}/retry`, "POST"),
    { store, handlers, waitUntil: (promise) => tasks.push(promise) },
  )
  assert.equal(retryResponse.status, 202)
  await tasks.shift()
  const completed = await store.get(created.jobId)
  assert.equal(completed.status, "completed")
  assert.equal(completed.attempt_count, 2)
})

test("does not duplicate a retry for a job that is already complete", async () => {
  const store = createMemoryHotelAnalysisJobStore()
  const tasks = []
  const createResponse = await handleHotelAnalysisJobs(
    request("/api/hotel-analysis/jobs", "POST", input),
    {
      store,
      handlers: successfulHandlers(),
      waitUntil: (promise) => tasks.push(promise),
    },
  )
  const created = await createResponse.json()
  await tasks.shift()

  const retryTasks = []
  const retryResponse = await handleHotelAnalysisJobs(
    request(`/api/hotel-analysis/jobs/${created.jobId}/retry`, "POST"),
    {
      store,
      handlers: successfulHandlers(),
      waitUntil: (promise) => retryTasks.push(promise),
    },
  )
  assert.equal(retryResponse.status, 200)
  assert.equal(retryTasks.length, 0)
  assert.equal((await retryResponse.json()).status, "completed")
})
