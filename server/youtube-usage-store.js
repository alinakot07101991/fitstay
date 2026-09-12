import {
  PROVIDER_USAGE_SCHEMA_SQL,
  createD1ProviderUsageStore,
  createInMemoryProviderUsageStore,
  utcDay,
} from "./provider-usage-store.js"

export const DEFAULT_YOUTUBE_DAILY_REQUEST_LIMIT = 50
export const YOUTUBE_USAGE_SCHEMA_SQL = PROVIDER_USAGE_SCHEMA_SQL

export function parseYouTubeDailyLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_YOUTUBE_DAILY_REQUEST_LIMIT
}

export function youtubeUtcDay(now = Date.now()) {
  return utcDay(now)
}

export function createInMemoryYouTubeUsageStore() {
  return createInMemoryProviderUsageStore("youtube")
}

export function createD1YouTubeUsageStore(database) {
  return createD1ProviderUsageStore(database, "youtube")
}
