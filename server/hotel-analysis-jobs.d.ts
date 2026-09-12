export interface HotelAnalysisJobStore {
  create(row: Record<string, unknown>): Promise<void>
  get(id: string): Promise<Record<string, unknown> | null>
  update(
    id: string,
    changes: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>
}

export declare function createMemoryHotelAnalysisJobStore(): HotelAnalysisJobStore
export declare function createD1HotelAnalysisJobStore(
  database: unknown,
): HotelAnalysisJobStore
export declare function createHotelAnalysisJobHandlers(
  configuration: Record<string, unknown>,
): Record<string, (input: unknown) => Promise<unknown>>
export declare function handleHotelAnalysisJobs(
  request: Request,
  options: Record<string, unknown>,
): Promise<Response | null>
