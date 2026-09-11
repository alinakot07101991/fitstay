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

type GooglePlacesResponse = { hotel: CanonicalGooglePlaceHotel }
type GooglePlacesErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
  candidates?: CanonicalGooglePlaceHotel[]
}

const SESSION_CACHE_PREFIX = "fitstay:google-place:"
const SESSION_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const inFlightResolutions =
  new Map<string, Promise<CanonicalGooglePlaceHotel>>()

function requestKey(hotelName: string, city: string, country: string) {
  return [hotelName, city, country]
    .map((value) =>
      value.normalize("NFKD").toLocaleLowerCase().trim().replace(/\s+/g, " "),
    )
    .join("|")
}

function readSessionCache(key: string): CanonicalGooglePlaceHotel | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + key)
    if (!value) return null
    const entry = JSON.parse(value) as {
      expiresAt?: number
      hotel?: CanonicalGooglePlaceHotel
    }
    if (
      !entry.hotel ||
      typeof entry.expiresAt !== "number" ||
      entry.expiresAt <= Date.now()
    ) {
      window.sessionStorage.removeItem(SESSION_CACHE_PREFIX + key)
      return null
    }
    return entry.hotel
  } catch {
    return null
  }
}

function writeSessionCache(key: string, hotel: CanonicalGooglePlaceHotel) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      SESSION_CACHE_PREFIX + key,
      JSON.stringify({
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        hotel,
      }),
    )
  } catch {
    // Storage may be unavailable in private browsing; the server cache still applies.
  }
}

export class GooglePlacesResolutionError extends Error {
  status: number
  code: string
  candidates: CanonicalGooglePlaceHotel[]

  constructor(
    status: number,
    code: string,
    message: string,
    candidates: CanonicalGooglePlaceHotel[] = [],
  ) {
    super(message)
    this.name = "GooglePlacesResolutionError"
    this.status = status
    this.code = code
    this.candidates = candidates
  }
}

export async function resolveGooglePlaceHotel(input: {
  hotelName: string
  city: string
  country: string
  signal?: AbortSignal
}): Promise<CanonicalGooglePlaceHotel> {
  const key = requestKey(input.hotelName, input.city, input.country)
  const cached = readSessionCache(key)
  if (cached) return cached
  const existing = inFlightResolutions.get(key)
  if (existing) return existing

  const request = fetch("/api/google-places/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hotelName: input.hotelName,
      city: input.city,
      country: input.country,
    }),
    signal: input.signal,
  })
    .then(async (response) => {
      const payload = (await response
        .json()
        .catch(
          () => null,
        )) as GooglePlacesResponse | GooglePlacesErrorPayload | null
      if (!response.ok) {
        const errorPayload = payload as GooglePlacesErrorPayload | null
        throw new GooglePlacesResolutionError(
          response.status,
          errorPayload?.error?.code || "google_places_request_failed",
          errorPayload?.error?.message ||
            "The hotel could not be identified with Google Places",
          errorPayload?.candidates || [],
        )
      }
      const hotel = (payload as GooglePlacesResponse).hotel
      writeSessionCache(key, hotel)
      return hotel
    })
    .finally(() => inFlightResolutions.delete(key))

  inFlightResolutions.set(key, request)
  return request
}
