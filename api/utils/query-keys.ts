/**
 * Query keys factory for type-safe query key management
 * 
 * Centralizes all query keys to prevent typos and ensure consistency.
 * Follows React Query v5 best practices for query key structure.
 * 
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 * 
 * @example
 * ```ts
 * // In a query hook:
 * useQuery({
 *   queryKey: queryKeys.auth.user(),
 *   queryFn: () => fetchUser(),
 * })
 * 
 * // In a mutation to invalidate:
 * queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
 * ```
 */
export const queryKeys = {
  /**
   * Authentication-related query keys
   */
  auth: {
    /**
     * Get current authenticated user
     */
    user: () => ['auth', 'user'] as const,

    /**
     * Get user by ID
     */
    userById: (userId: string) => ['auth', 'user', userId] as const,
  },

  /**
   * Booth-related query keys
   * @see /api/booths/queries.ts
   */
  booths: {
    /**
     * Get all booths for current user
     */
    all: () => ['booths'] as const,

    /**
     * Get all booths with filters
     */
    list: (filters?: { status?: string; search?: string }) => 
      ['booths', 'list', filters] as const,

    /**
     * Get single booth by ID
     */
    detail: (boothId: string) => ['booths', 'detail', boothId] as const,

    /**
     * Get booth statistics
     */
    stats: (boothId: string) => ['booths', 'stats', boothId] as const,
  },

  /**
   * Analytics-related query keys
   * @see /api/analytics/queries.ts
   */
  analytics: {
    /**
     * Get revenue dashboard data
     */
    dashboard: (params?: { recent_limit?: number; recent_offset?: number }) =>
      ['analytics', 'dashboard', params] as const,

    /**
     * Get transactions list with infinite scroll
     */
    transactions: (pageSize?: number) =>
      ['analytics', 'transactions', pageSize] as const,

    /**
     * Get revenue data for a specific booth
     */
    boothRevenue: (boothId: string) =>
      ['analytics', 'booth', boothId, 'revenue'] as const,
  },

  /**
   * Alerts-related query keys
   * @see /api/alerts/queries.ts
   */
  alerts: {
    /**
     * Get all alerts
     */
    all: () => ['alerts'] as const,

    /**
     * Get alerts with filters
     */
    list: (params?: { severity?: string; category?: string; limit?: number }) =>
      ['alerts', 'list', params] as const,

    /**
     * Get single alert by ID
     */
    detail: (alertId: string) => ['alerts', 'detail', alertId] as const,
  },

  /**
   * Dashboard-related query keys
   * @see GET /api/v1/booths/overview/all
   * @see /api/booths/queries.ts - useDashboardOverview
   */
  dashboard: {
    /**
     * Get dashboard overview (all booths aggregated)
     */
    overview: () => ['booths', 'overview', 'all'] as const,
  },
} as const;

