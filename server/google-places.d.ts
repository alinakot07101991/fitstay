export type CanonicalGooglePlaceHotel = {
  source: "google_places"
  placeId: string
  name: string
  formattedAddress: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  rating: number | null
  reviewCount: number | null
  googleMapsUrl: string | null
}

export declare function handleGooglePlacesHotelResolution(
  request: Request,
  apiKey?: string,
  options?: {
    fetchImpl?: typeof fetch
    logger?: Pick<Console, "info" | "warn">
    cache?: Map<string, unknown>
    inFlight?: Map<string, Promise<CanonicalGooglePlaceHotel>>
    now?: () => number
  },
): Promise<Response>
