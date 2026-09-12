export declare const PROVIDER_USAGE_SCHEMA_SQL: string

export type ProviderUsageReservation = {
  allowed: boolean
  count: number
}

export type ProviderUsageStore = {
  reserve(
    dayUtc: string,
    limit: number,
    timestamp?: string,
  ): Promise<ProviderUsageReservation>
  getCount(dayUtc: string): Promise<number>
}

export declare function utcDay(now?: number): string
export declare function createInMemoryProviderUsageStore(
  provider: string,
): ProviderUsageStore
export declare function createD1ProviderUsageStore(
  database: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        first(): Promise<Record<string, unknown> | null>
      }
      run(): Promise<unknown>
    }
  },
  provider: string,
): ProviderUsageStore
