import assert from "node:assert/strict"
import test from "node:test"

import { createD1ProviderUsageStore } from "./provider-usage-store.js"

function createFakeD1() {
  const rows = new Map()
  const statements = []

  const prepare = (sql, values = []) => ({
    bind(...nextValues) {
      return prepare(sql, nextValues)
    },
    async run() {
      statements.push(sql)
      if (sql.startsWith("CREATE TABLE")) return { meta: { changes: 0 } }
      assert.match(sql, /^INSERT INTO provider_daily_usage/)
      assert.doesNotMatch(sql, /RETURNING/i)
      const [provider, dayUtc, _timestamp, limit] = values
      const key = `${provider}:${dayUtc}`
      const current = rows.get(key)
      if (current === undefined) {
        rows.set(key, 1)
        return { meta: { changes: 1 } }
      }
      if (current < limit) {
        rows.set(key, current + 1)
        return { meta: { changes: 1 } }
      }
      return { meta: { changes: 0 } }
    },
    async first() {
      assert.match(sql, /^SELECT request_count/)
      const [provider, dayUtc] = values
      const requestCount = rows.get(`${provider}:${dayUtc}`)
      return requestCount === undefined ? null : { request_count: requestCount }
    },
  })

  return { database: { prepare }, rows, statements }
}

test("D1 usage reservations stay within the daily limit without RETURNING", async () => {
  const fake = createFakeD1()
  const store = createD1ProviderUsageStore(fake.database, "groq_analysis")

  assert.deepEqual(await store.reserve("2026-09-12", 2), {
    allowed: true,
    count: 1,
  })
  assert.deepEqual(await store.reserve("2026-09-12", 2), {
    allowed: true,
    count: 2,
  })
  assert.deepEqual(await store.reserve("2026-09-12", 2), {
    allowed: false,
    count: 2,
  })
  assert.equal(await store.getCount("2026-09-12"), 2)
  assert.equal(fake.rows.size, 1)
})
