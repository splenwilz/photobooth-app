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

    /**
     * Get booth pricing
     */
    pricing: (boothId: string) => ['booths', 'pricing', boothId] as const,

    /**
     * Get booth credentials (API key, QR code)
     * @see GET /api/v1/booths/{booth_id}/credentials
     */
    credentials: (boothId: string) => ['booths', 'credentials', boothId] as const,
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

  /**
   * Credits-related query keys
   * @see GET /api/v1/booths/{booth_id}/credits
   * @see POST /api/v1/booths/{booth_id}/credits
   */
  credits: {
    /**
     * Get booth credit balance
     */
    balance: (boothId: string) => ['credits', 'balance', boothId] as const,

    /**
     * Get credit history for a booth
     * @param boothId - The booth ID
     * @param params - Optional pagination params (limit, offset)
     */
    history: (boothId: string, params?: { limit?: number; offset?: number }) =>
      ['credits', 'history', boothId, params] as const,
  },

  /**
   * Payments/Subscription-related query keys
   * @see GET /api/v1/payments/access
   * @see GET /api/v1/payments/subscription
   * @see GET /api/v1/payments/booths/subscriptions
   * @see GET /api/v1/booths/{booth_id}/subscription
   */
  payments: {
    /**
     * Check subscription access (lightweight check)
     */
    access: () => ['payments', 'access'] as const,

    /**
     * Get full subscription details
     */
    subscription: () => ['payments', 'subscription'] as const,

    /**
     * Get all booth subscriptions for user
     * @see GET /api/v1/payments/booths/subscriptions
     */
    boothSubscriptions: () => ['payments', 'boothSubscriptions'] as const,

    /**
     * Get single booth subscription status
     * @see GET /api/v1/booths/{booth_id}/subscription
     */
    boothSubscription: (boothId: string) => ['payments', 'boothSubscription', boothId] as const,
  },

  /**
   * Licensing-related query keys
   * @see POST /api/v1/licensing/activate-booth
   */
  licensing: {
    /**
     * Base key for all licensing queries
     */
    all: () => ['licensing'] as const,
  },
} as const;

