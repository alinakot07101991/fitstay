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

export type GooglePlaceCandidate = CanonicalGooglePlaceHotel & {
  primaryType: string | null
}

export type RankedGooglePlaceCandidate = {
  candidate: GooglePlaceCandidate
  similarity: number
  cityMatches: boolean | null
  countryMatches: boolean | null
  lodging: boolean
}

export declare const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT: string
export declare const GOOGLE_PLACES_FIELD_MASK: string

export declare class GooglePlacesServiceError extends Error {
  code: string
  status: number
  candidates: CanonicalGooglePlaceHotel[]
  retryAfter: string | null
}

export declare function normalizeGooglePlace(place: unknown): GooglePlaceCandidate

export declare function createGooglePlacesService(options: {
  apiKey: string
  fetchImpl?: typeof fetch
  logger?: Pick<Console, "info" | "warn">
  cache?: Map<string, unknown>
  inFlight?: Map<string, Promise<CanonicalGooglePlaceHotel>>
  now?: () => number
}): {
  searchHotel(query: string): Promise<GooglePlaceCandidate[]>
  getHotelCandidates(
    hotelName: string,
    city: string,
    country: string,
  ): Promise<RankedGooglePlaceCandidate[]>
  resolveHotel(
    hotelName: string,
    city: string,
    country: string,
  ): Promise<CanonicalGooglePlaceHotel>
  resolveHotelQuery(query: string): Promise<CanonicalGooglePlaceHotel>
}
