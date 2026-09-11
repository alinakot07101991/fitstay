export type TripadvisorReview = {
  source: "tripadvisor"
  sourceId: string
  hotelId: string
  title: string | null
  text: string
  rating: number | null
  publishedAt: string | null
  tripType: string | null
  subratings: Record<string, unknown> | null
  sourceUrl: string | null
}

export type TripadvisorHotel = {
  locationId: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  sourceUrl: string | null
}

export type TripadvisorHotelReviews = {
  hotel: TripadvisorHotel
  tripadvisorLocationId: string
  totalReviews: number
  reviews: TripadvisorReview[]
}

export type TripadvisorCandidate = TripadvisorHotel

export class TripadvisorReviewsError extends Error {
  status: number
  code: string
  candidates: TripadvisorCandidate[]

  constructor(status: number, code: string, message: string, candidates: TripadvisorCandidate[] = []) {
    super(message)
    this.name = "TripadvisorReviewsError"
    this.status = status
    this.code = code
    this.candidates = candidates
  }
}

export async function fetchTripadvisorHotelReviews(input: {
  hotelName: string
  city?: string
  country?: string
  signal?: AbortSignal
}): Promise<TripadvisorHotelReviews> {
  const response = await fetch("/api/tripadvisor/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelName: input.hotelName,
      city: input.city,
      country: input.country,
    }),
    signal: input.signal,
  })
  const payload = await response.json().catch(() => null) as {
    error?: { code?: string; message?: string }
    candidates?: TripadvisorCandidate[]
  } | TripadvisorHotelReviews | null

  if (!response.ok) {
    const errorPayload = payload && "error" in payload ? payload : null
    throw new TripadvisorReviewsError(
      response.status,
      errorPayload?.error?.code || "tripadvisor_request_failed",
      errorPayload?.error?.message || "Tripadvisor reviews could not be retrieved",
      errorPayload?.candidates || [],
    )
  }
  return payload as TripadvisorHotelReviews
}
