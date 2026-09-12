import type {
  HotelAnalysisPreference,
  HotelAnalysisResult,
} from "./hotelAnalysis"
import type {
  CanonicalHotelForAnalysis,
  HotelAnalysisProgress,
} from "./runHotelAnalysis"

export type HotelAnalysisJobStatus = "queued" | "processing" | "completed" | "failed"

export type HotelAnalysisJob = {
  jobId: string
  status: HotelAnalysisJobStatus
  stage: HotelAnalysisProgress
  result: HotelAnalysisResult | null
  error: {
    code: string
    message: string
  } | null
  updatedAt: string
}

export class HotelAnalysisJobError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "HotelAnalysisJobError"
    this.status = status
    this.code = code
  }
}

async function requestJob(path: string, init?: RequestInit) {
  const response = await fetch(path, init)
  const payload = (await response.json().catch(() => null)) as
    | HotelAnalysisJob
    | {
        error?: {
          code?: string
          message?: string
        }
      }
    | null
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null
    throw new HotelAnalysisJobError(
      response.status,
      error?.code || "HOTEL_ANALYSIS_JOB_ERROR",
      error?.message || "The hotel analysis could not be updated",
    )
  }
  return payload as HotelAnalysisJob
}

export function startHotelAnalysisJob(input: {
  hotel: CanonicalHotelForAnalysis
  preferences: HotelAnalysisPreference[]
}) {
  return requestJob("/api/hotel-analysis/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function getHotelAnalysisJob(jobId: string) {
  return requestJob(`/api/hotel-analysis/jobs/${encodeURIComponent(jobId)}`)
}

export function retryHotelAnalysisJob(jobId: string) {
  return requestJob(
    `/api/hotel-analysis/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: "POST" },
  )
}
