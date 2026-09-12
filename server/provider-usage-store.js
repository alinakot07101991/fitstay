export const PROVIDER_USAGE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS provider_daily_usage (
  provider TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, day_utc)
)`

export function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

export function createInMemoryProviderUsageStore(provider) {
  const counts = new Map()
  return {
    async reserve(dayUtc, limit) {
      const key = `${provider}:${dayUtc}`
      const current = counts.get(key) || 0
      if (current >= limit) return { allowed: false, count: current }
      const count = current + 1
      counts.set(key, count)
      return { allowed: true, count }
    },
    async getCount(dayUtc) {
      return counts.get(`${provider}:${dayUtc}`) || 0
    },
  }
}

export function createD1ProviderUsageStore(database, provider) {
  let initialization
  const ensureSchema = () => {
    initialization ||= database.prepare(PROVIDER_USAGE_SCHEMA_SQL).run()
    return initialization
  }

  return {
    async reserve(dayUtc, limit, timestamp = new Date().toISOString()) {
      await ensureSchema()
      const row = await database
        .prepare(`INSERT INTO provider_daily_usage (
        provider, day_utc, request_count, updated_at
      ) VALUES (?, ?, 1, ?)
      ON CONFLICT(provider, day_utc) DO UPDATE SET
        request_count = provider_daily_usage.request_count + 1,
        updated_at = excluded.updated_at
      WHERE provider_daily_usage.request_count < ?
      RETURNING request_count`)
        .bind(provider, dayUtc, timestamp, limit)
        .first()

      if (row && Number.isFinite(Number(row.request_count))) {
        return { allowed: true, count: Number(row.request_count) }
      }
      return { allowed: false, count: await this.getCount(dayUtc) }
    },
    async getCount(dayUtc) {
      await ensureSchema()
      const row = await database
        .prepare(
          "SELECT request_count FROM provider_daily_usage WHERE provider = ? AND day_utc = ?",
        )
        .bind(provider, dayUtc)
        .first()
      return Number.isFinite(Number(row?.request_count))
        ? Number(row.request_count)
        : 0
    },
  }
}
