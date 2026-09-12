export declare const DEFAULT_YOUTUBE_DAILY_REQUEST_LIMIT: 50
export declare const YOUTUBE_USAGE_SCHEMA_SQL: string

export type YouTubeUsageReservation = {
  allowed: boolean
  count: number
}

export type YouTubeUsageStore = {
  reserve(
    dayUtc: string,
    limit: number,
    timestamp?: string,
  ): Promise<YouTubeUsageReservation>
  getCount(dayUtc: string): Promise<number>
}

export declare function parseYouTubeDailyLimit(value: unknown): number
export declare function youtubeUtcDay(now?: number): string
export declare function createInMemoryYouTubeUsageStore(): YouTubeUsageStore
export declare function createD1YouTubeUsageStore(database: {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first(): Promise<Record<string, unknown> | null>
    }
    run(): Promise<unknown>
  }
}): YouTubeUsageStore
