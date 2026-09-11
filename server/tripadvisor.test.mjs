import assert from "node:assert/strict"
import test from "node:test"

import { handleTripadvisorHotelReviews } from "./tripadvisor.js"

function request(body) {
  return new Request("http://localhost/api/tripadvisor/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("returns ambiguous hotel candidates without requesting reviews", async () => {
  const urls = []
  const response = await handleTripadvisorHotelReviews(
    request({ hotelName: "Hilton" }),
    "server-secret",
    {
      logger: { info() {} },
      fetchImpl: async (url, init) => {
        urls.push(String(url))
        assert.equal(init.headers["X-API-Key"], "server-secret")
        return Response.json({
          data: [
            { tripadvisor_id: 1, names: [{ value: "Hilton Paris Opera", primary: true }] },
            { tripadvisor_id: 2, names: [{ value: "Hilton Garden Inn", primary: true }] },
          ],
        })
      },
    },
  )

  assert.equal(response.status, 409)
  assert.equal(urls.length, 1)
  const payload = await response.json()
  assert.equal(payload.error.code, "ambiguous_hotel")
  assert.equal(payload.candidates.length, 2)
})

test("retrieves every review page and preserves original review text", async () => {
  const logs = []
  const response = await handleTripadvisorHotelReviews(
    request({ hotelName: "Hotel Eden", city: "Rome", country: "Italy" }),
    "server-secret",
    {
      logger: { info: (_message, details) => logs.push(details) },
      fetchImpl: async (url) => {
        const parsed = new URL(url)
        if (parsed.pathname.endsWith("/locations/search")) {
          return Response.json({
            data: [{
              tripadvisor_id: 42,
              names: [{ value: "Hotel Eden", primary: true }],
              address: { city: "Rome", country: "Italy", formatted: "Rome, Italy" },
            }],
          })
        }
        const page = Number(parsed.searchParams.get("page"))
        assert.equal(parsed.searchParams.get("language"), "primary")
        if (page === 1) {
          return Response.json({
            data: [{ id: 100, title: "Lovely", text: "  Original wording stays unchanged.  ", rating: 5 }],
            pagination: { page: 1, total_pages: 2 },
          })
        }
        return Response.json({
          data: [{ id: 101, text: "Second review", trip_type: "couples" }],
          pagination: { page: 2, total_pages: 2 },
        })
      },
    },
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.tripadvisorLocationId, "42")
  assert.equal(payload.totalReviews, 2)
  assert.equal(payload.reviews[0].text, "  Original wording stays unchanged.  ")
  assert.deepEqual(logs.at(-1), {
    outcome: "success",
    apiCalls: 3,
    reviewsRetrieved: 2,
    pagesRequested: 2,
  })
})

test("maps Tripadvisor rate limits without exposing credentials", async () => {
  const response = await handleTripadvisorHotelReviews(
    request({ hotelName: "Hotel Eden" }),
    "server-secret",
    {
      logger: { info() {} },
      fetchImpl: async () => Response.json(
        { title: "Too Many Requests" },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    },
  )

  assert.equal(response.status, 429)
  assert.equal(response.headers.get("Retry-After"), "30")
  const payload = await response.json()
  assert.equal(payload.error.code, "tripadvisor_rate_limited")
  assert.equal(JSON.stringify(payload).includes("server-secret"), false)
})
