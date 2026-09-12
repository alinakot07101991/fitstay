/** Sites D1 schema used for atomic provider-level daily request safeguards. */
export const providerDailyUsageSchema = {
  table: "provider_daily_usage",
  primaryKey: ["provider", "day_utc"] as const,
  columns: {
    provider: "text",
    dayUtc: "text",
    requestCount: "integer",
    updatedAt: "text",
  },
} as const
