import assert from "node:assert/strict"
import test from "node:test"

import { handleGoogleHotelsReviews } from "./serpapi-google-hotels.js"

function request(body) {
  return new Request("http://localhost/api/google-hotels/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("returns ambiguous Google Hotels candidates before requesting details", async () => {
  let calls = 0
  const response = await handleGoogleHotelsReviews(
    request({ hotelName: "Hilton", city: "London", country: "United Kingdom" }),
    "server-secret",
    {
      logger: { info() {}, warn() {} },
      fetchImpl: async (url) => {
        calls += 1
        const parsed = new URL(url)
        assert.equal(parsed.searchParams.get("api_key"), "server-secret")
        return Response.json({
          properties: [
            { name: "Hilton London Metropole", property_token: "one" },
            { name: "Hilton London Bankside", property_token: "two" },
          ],
        })
      },
    },
  )

  assert.equal(response.status, 409)
  assert.equal(calls, 1)
  const payload = await response.json()
  assert.equal(payload.error.code, "ambiguous_hotel")
  assert.equal(payload.candidates.length, 2)
  assert.equal(JSON.stringify(payload).includes("server-secret"), false)
})

test("uses a direct Google Hotels property result without a duplicate details request", async () => {
  let calls = 0
  const response = await handleGoogleHotelsReviews(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      logger: { info() {}, warn() {} },
      fetchImpl: async (url) => {
        calls += 1
        const parsed = new URL(url)
        if (calls === 1) {
          assert.ok(parsed.searchParams.get("check_in_date"))
          assert.ok(parsed.searchParams.get("check_out_date"))
          return Response.json({
            ads: [{ name: "Sponsored alternative", property_token: "ad-token" }],
            name: "Hotel Eden",
            address: "Via Ludovisi 49, Rome, Italy",
            property_token: "hotel-token",
          })
        }
        assert.equal(parsed.searchParams.get("engine"), "google_hotels_reviews")
        return Response.json({ reviews: [{ source: "Google", snippet: "Original" }] })
      },
    },
  )

  assert.equal(response.status, 200)
  assert.equal(calls, 2)
  const payload = await response.json()
  assert.equal(payload.hotel.name, "Hotel Eden")
  assert.equal(payload.reviewsRetrieved, 1)
})

test("retrieves all available review pages and preserves review text", async () => {
  const logs = []
  const response = await handleGoogleHotelsReviews(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      logger: {
        info: (_message, details) => logs.push(details),
        warn: (_message, details) => logs.push(details),
      },
      fetchImpl: async (url) => {
        const parsed = new URL(url)
        const engine = parsed.searchParams.get("engine")
        if (engine === "google_hotels" && !parsed.searchParams.has("property_token")) {
          assert.match(parsed.searchParams.get("q"), /Hotel Eden.*Rome.*Italy/)
          return Response.json({
            properties: [{ name: "Hotel Eden", property_token: "hotel-token" }],
          })
        }
        if (engine === "google_hotels") {
          return Response.json({
            name: "Hotel Eden",
            address: "Via Ludovisi 49, Rome, Italy",
            property_token: "hotel-token",
          })
        }

        assert.equal(engine, "google_hotels_reviews")
        assert.equal(parsed.searchParams.get("source_number"), "-1")
        const token = parsed.searchParams.get("next_page_token")
        if (!token) {
          return Response.json({
            reviews: [{
              user: { name: "Ada" },
              rating: 5,
              snippet: "  Original review text stays unchanged.  ",
              date: "2 weeks ago",
            }],
            serpapi_pagination: { next_page_token: "page-two" },
          })
        }
        assert.equal(token, "page-two")
        return Response.json({
          reviews: [{ review_id: "review-2", snippet: "Second review" }],
          serpapi_pagination: {},
        })
      },
    },
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.hotel.propertyToken, "hotel-token")
  assert.equal(payload.reviewsRetrieved, 2)
  assert.equal(payload.reviews[0].text, "  Original review text stays unchanged.  ")
  assert.equal(payload.reviews[0].author, "Ada")
  assert.equal(payload.reviews[1].sourceId, "review-2")
  assert.deepEqual(logs.at(-1), {
    outcome: "success",
    apiCalls: 4,
    reviewPagesRequested: 2,
    reviewsRetrieved: 2,
  })
})

test("maps SerpApi quota failures without exposing the API key", async () => {
  const response = await handleGoogleHotelsReviews(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      logger: { info() {}, warn() {} },
      fetchImpl: async () => Response.json({ error: "Your account has run out of searches." }),
    },
  )

  assert.equal(response.status, 429)
  const payload = await response.json()
  assert.equal(payload.error.code, "serpapi_rate_limited")
  assert.equal(JSON.stringify(payload).includes("server-secret"), false)
})

test("reports malformed review responses gracefully", async () => {
  let calls = 0
  const response = await handleGoogleHotelsReviews(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      logger: { info() {}, warn() {} },
      fetchImpl: async () => {
        calls += 1
        if (calls === 1) return Response.json({ properties: [{ name: "Hotel Eden", property_token: "token" }] })
        if (calls === 2) return Response.json({ name: "Hotel Eden", address: "Rome, Italy", property_token: "token" })
        return Response.json({ unexpected: true })
      },
    },
  )

  assert.equal(response.status, 502)
  const payload = await response.json()
  assert.equal(payload.error.code, "serpapi_malformed_response")
})
