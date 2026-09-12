export const DEFAULT_YOUTUBE_DAILY_REQUEST_LIMIT = 50

export const YOUTUBE_USAGE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS provider_daily_usage (
  provider TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, day_utc)
)`

const PROVIDER = "youtube"

export function parseYouTubeDailyLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_YOUTUBE_DAILY_REQUEST_LIMIT
}

export function youtubeUtcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

export function createInMemoryYouTubeUsageStore() {
  const counts = new Map()
  return {
    async reserve(dayUtc, limit) {
      const current = counts.get(dayUtc) || 0
      if (current >= limit) return { allowed: false, count: current }
      const count = current + 1
      counts.set(dayUtc, count)
      return { allowed: true, count }
    },
    async getCount(dayUtc) {
      return counts.get(dayUtc) || 0
    },
  }
}

export function createD1YouTubeUsageStore(database) {
  let initialization
  const ensureSchema = () => {
    initialization ||= database.prepare(YOUTUBE_USAGE_SCHEMA_SQL).run()
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
        .bind(PROVIDER, dayUtc, timestamp, limit)
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
        .bind(PROVIDER, dayUtc)
        .first()
      return Number.isFinite(Number(row?.request_count))
        ? Number(row.request_count)
        : 0
    },
  }
}
