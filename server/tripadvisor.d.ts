export type TripadvisorHandlerOptions = {
  logger?: Pick<Console, "info">
  fetchImpl?: typeof fetch
}

export function normalizeTripadvisorReview(
  review: Record<string, unknown>,
  hotelId: string,
  page: number,
  index: number,
): Record<string, unknown>

export function handleTripadvisorHotelReviews(
  request: Request,
  apiKey: string | undefined,
  options?: TripadvisorHandlerOptions,
): Promise<Response>
