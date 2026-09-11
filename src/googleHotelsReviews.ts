export type GoogleHotelsReview = {
  source: "google_hotels"
  sourceId: string | null
  hotelId: string
  author: string | null
  rating: number | null
  title: string | null
  text: string
  publishedAt: string | null
  tripType: string | null
  subratings: Record<string, unknown> | null
  sourceUrl: string | null
}

export type GoogleHotelsProperty = {
  name: string
  location: string | null
  propertyToken: string
}

export type GoogleHotelsReviewsResult = {
  hotel: GoogleHotelsProperty
  reviewsRetrieved: number
  reviews: GoogleHotelsReview[]
}

export class GoogleHotelsReviewsError extends Error {
  status: number
  code: string
  candidates: GoogleHotelsProperty[]

  constructor(status: number, code: string, message: string, candidates: GoogleHotelsProperty[] = []) {
    super(message)
    this.name = "GoogleHotelsReviewsError"
    this.status = status
    this.code = code
    this.candidates = candidates
  }
}

export async function fetchGoogleHotelsReviews(input: {
  hotelName: string
  city: string
  country: string
  signal?: AbortSignal
}): Promise<GoogleHotelsReviewsResult> {
  const response = await fetch("/api/google-hotels/reviews", {
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
    candidates?: GoogleHotelsProperty[]
  } | GoogleHotelsReviewsResult | null

  if (!response.ok) {
    const errorPayload = payload && "error" in payload ? payload : null
    throw new GoogleHotelsReviewsError(
      response.status,
      errorPayload?.error?.code || "google_hotels_request_failed",
      errorPayload?.error?.message || "Google Hotels reviews could not be retrieved",
      errorPayload?.candidates || [],
    )
  }
  return payload as GoogleHotelsReviewsResult
}

