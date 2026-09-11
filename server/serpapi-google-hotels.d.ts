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

export declare function normalizeGoogleHotelsReview(
  review: Record<string, unknown>,
  hotelId: string,
): GoogleHotelsReview

export declare function handleGoogleHotelsReviews(
  request: Request,
  apiKey?: string,
  options?: {
    fetchImpl?: typeof fetch
    logger?: Pick<Console, "info" | "warn">
  },
): Promise<Response>

