import assert from "node:assert/strict"
import test from "node:test"

import { GOOGLE_PLACES_FIELD_MASK } from "./google-places-service.js"
import { handleGooglePlacesHotelResolution } from "./google-places.js"

function request(body) {
  return new Request("http://localhost/api/google-places/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function hotel(overrides = {}) {
  return {
    id: "ChIJ-hotel-eden",
    displayName: { text: "Hotel Eden", languageCode: "en" },
    formattedAddress: "Via Ludovisi 49, 00187 Rome, Italy",
    addressComponents: [
      { longText: "Rome", shortText: "RM", types: ["locality"] },
      { longText: "Italy", shortText: "IT", types: ["country"] },
    ],
    location: { latitude: 41.906, longitude: 12.49 },
    primaryType: "hotel",
    googleMapsUri: "https://maps.google.com/?cid=hotel-eden",
    rating: 4.7,
    userRatingCount: 938,
    ...overrides,
  }
}

test("resolves one canonical hotel using one minimal Text Search request", async () => {
  const logs = []
  let calls = 0
  const response = await handleGooglePlacesHotelResolution(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info: (_message, details) => logs.push(details), warn() {} },
      fetchImpl: async (url, init) => {
        calls += 1
        assert.equal(url, "https://places.googleapis.com/v1/places:searchText")
        assert.equal(init.headers["X-Goog-Api-Key"], "server-secret")
        assert.equal(init.headers["X-Goog-FieldMask"], GOOGLE_PLACES_FIELD_MASK)
        assert.equal(
          init.headers["X-Goog-FieldMask"].includes("reviews"),
          false,
        )
        const body = JSON.parse(init.body)
        assert.equal(body.textQuery, "Hotel Eden, Rome, Italy")
        assert.equal(body.pageSize, 10)
        return Response.json({ places: [hotel()] })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  const payload = await response.json()
  assert.deepEqual(payload.hotel, {
    source: "google_places",
    placeId: "ChIJ-hotel-eden",
    name: "Hotel Eden",
    formattedAddress: "Via Ludovisi 49, 00187 Rome, Italy",
    city: "Rome",
    country: "Italy",
    latitude: 41.906,
    longitude: 12.49,
    rating: 4.7,
    reviewCount: 938,
    googleMapsUrl: "https://maps.google.com/?cid=hotel-eden",
  })
  assert.equal(logs.at(-1).placeId, "ChIJ-hotel-eden")
})

test("returns multiple strong matches as ambiguous", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () =>
        Response.json({
          places: [
            hotel(),
            hotel({
              id: "ChIJ-other-eden",
              formattedAddress: "Via Roma 2, Rome, Italy",
            }),
          ],
        }),
    },
  )

  assert.equal(response.status, 409)
  const payload = await response.json()
  assert.equal(payload.error.code, "ambiguous_hotel")
  assert.equal(payload.candidates.length, 2)
  assert.equal(JSON.stringify(payload).includes("server-secret"), false)
})

test("accepts a freeform full hotel name with destination", async () => {
  let calls = 0
  const response = await handleGooglePlacesHotelResolution(
    request({ query: "Hotel Eden Rome Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async (_url, init) => {
        calls += 1
        assert.equal(JSON.parse(init.body).textQuery, "Hotel Eden Rome Italy")
        return Response.json({ places: [hotel()] })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  assert.equal((await response.json()).hotel.placeId, "ChIJ-hotel-eden")
})

test("returns worldwide partial-name matches for user selection", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ query: "Mitsis Greece" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () =>
        Response.json({
          places: [
            hotel({
              id: "mitsis-rinela",
              displayName: { text: "Mitsis Rinela" },
              formattedAddress: "Crete, Greece",
            }),
            hotel({
              id: "mitsis-alila",
              displayName: { text: "Mitsis Selection Alila" },
              formattedAddress: "Rhodes, Greece",
            }),
          ],
        }),
    },
  )

  assert.equal(response.status, 409)
  const payload = await response.json()
  assert.equal(payload.error.code, "ambiguous_hotel")
  assert.deepEqual(
    payload.candidates.map((candidate) => candidate.placeId),
    ["mitsis-rinela", "mitsis-alila"],
  )
})

test("filters non-lodging places from freeform hotel results", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ query: "Eden Rome" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () =>
        Response.json({
          places: [
            hotel({ primaryType: "restaurant" }),
            hotel({
              id: "real-hotel",
              displayName: { text: "Eden Roma" },
            }),
          ],
        }),
    },
  )

  assert.equal(response.status, 200)
  assert.equal((await response.json()).hotel.placeId, "real-hotel")
})

test("accepts a unique exact hotel when Google localizes the city name", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () =>
        Response.json({
          places: [
            hotel({
              formattedAddress: "Via Ludovisi 49, 00187 Roma, Italy",
              addressComponents: [
                { longText: "Roma", shortText: "RM", types: ["locality"] },
                { longText: "Italy", shortText: "IT", types: ["country"] },
              ],
            }),
          ],
        }),
    },
  )

  assert.equal(response.status, 200)
  assert.equal((await response.json()).hotel.city, "Roma")
})

test("reuses a successful cached resolution without another Google request", async () => {
  const cache = new Map()
  const inFlight = new Map()
  let calls = 0
  const options = {
    cache,
    inFlight,
    logger: { info() {}, warn() {} },
    fetchImpl: async () => {
      calls += 1
      return Response.json({ places: [hotel()] })
    },
  }
  const body = { hotelName: "Hotel Eden", city: "Rome", country: "Italy" }
  const first = await handleGooglePlacesHotelResolution(
    request(body),
    "server-secret",
    options,
  )
  const second = await handleGooglePlacesHotelResolution(
    request(body),
    "server-secret",
    options,
  )

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(calls, 1)
  assert.deepEqual(await second.json(), await first.json())
})

test("deduplicates concurrent resolutions for the same hotel", async () => {
  const cache = new Map()
  const inFlight = new Map()
  let calls = 0
  const options = {
    cache,
    inFlight,
    logger: { info() {}, warn() {} },
    fetchImpl: async () => {
      calls += 1
      await new Promise((resolve) => setTimeout(resolve, 5))
      return Response.json({ places: [hotel()] })
    },
  }
  const body = { hotelName: "Hotel Eden", city: "Rome", country: "Italy" }
  const [first, second] = await Promise.all([
    handleGooglePlacesHotelResolution(request(body), "server-secret", options),
    handleGooglePlacesHotelResolution(request(body), "server-secret", options),
  ])

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(calls, 1)
})

test("returns hotel not found when no lodging candidate matches", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () => Response.json({ places: [] }),
    },
  )

  assert.equal(response.status, 404)
  assert.equal((await response.json()).error.code, "hotel_not_found")
})

test("returns a structured network error", async () => {
  const response = await handleGooglePlacesHotelResolution(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      cache: new Map(),
      inFlight: new Map(),
      logger: { info() {}, warn() {} },
      fetchImpl: async () => {
        throw new TypeError("network unavailable")
      },
    },
  )

  assert.equal(response.status, 502)
  assert.equal((await response.json()).error.code, "google_places_network_error")
})

test("maps invalid keys, billing, quota, and malformed responses", async (context) => {
  const cases = [
    [
      { error: { status: "INVALID_ARGUMENT", message: "API key not valid" } },
      400,
      503,
      "google_places_invalid_api_key",
    ],
    [
      {
        error: { status: "PERMISSION_DENIED", message: "Billing is disabled" },
      },
      403,
      503,
      "google_places_billing_disabled",
    ],
    [
      { error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" } },
      429,
      429,
      "google_places_quota_exceeded",
    ],
    [{ places: "not-an-array" }, 200, 502, "google_places_malformed_response"],
  ]
  for (const [
    upstreamBody,
    upstreamStatus,
    expectedStatus,
    expectedCode,
  ] of cases) {
    await context.test(expectedCode, async () => {
      const response = await handleGooglePlacesHotelResolution(
        request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
        "server-secret",
        {
          cache: new Map(),
          inFlight: new Map(),
          logger: { info() {}, warn() {} },
          fetchImpl: async () =>
            Response.json(upstreamBody, { status: upstreamStatus }),
        },
      )
      assert.equal(response.status, expectedStatus)
      const payload = await response.json()
      assert.equal(payload.error.code, expectedCode)
      assert.equal(JSON.stringify(payload).includes("server-secret"), false)
    })
  }
})
