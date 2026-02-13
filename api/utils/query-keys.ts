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
   * User profile query keys
   * @see /api/users/queries.ts
   */
  users: {
    /**
     * Get user profile by ID
     * @see GET /api/v1/users/{user_id}
     */
    profile: (userId: string) => ['users', 'profile', userId] as const,
  },

  /**
   * Booth-related query keys
   * @see /api/booths/queries.ts
   */
  booths: {
    /**
     * Base prefix for all booth queries (used for broad invalidation)
     */
    all: () => ['booths'] as const,

    /**
     * Get booth overview with summary and all booths
     * @see GET /api/v1/booths/overview
     */
    overview: () => ['booths', 'overview'] as const,

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

    /**
     * Get booth business settings
     * @see GET /api/v1/booths/{booth_id}/business-settings
     */
    businessSettings: (boothId: string) => ['booths', 'businessSettings', boothId] as const,
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

  /**
   * Support tickets query keys
   * @see /api/tickets/queries.ts
   */
  tickets: {
    /**
     * Base key for all ticket queries
     */
    all: () => ['tickets'] as const,

    /**
     * Get tickets list with optional filters
     */
    list: (params?: { page?: number; per_page?: number; status?: string }) =>
      ['tickets', 'list', params] as const,

    /**
     * Get single ticket by ID with messages
     */
    detail: (ticketId: number) => ['tickets', 'detail', ticketId] as const,
  },

  /**
   * Notification preferences query keys
   * @see /api/notifications/queries.ts
   */
  notifications: {
    /**
     * Base key for all notification queries
     */
    all: () => ['notifications'] as const,

    /**
     * Get notification preferences
     */
    preferences: () => ['notifications', 'preferences'] as const,

    /**
     * Get notification history with pagination
     */
    history: (params?: { limit?: number; offset?: number }) =>
      ['notifications', 'history', params] as const,
  },

  /**
   * Pricing-related query keys
   * @see GET /api/v1/pricing/plans
   */
  pricing: {
    /**
     * Get all pricing plans
     */
    plans: () => ['pricing', 'plans'] as const,
  },

  /**
   * Template store query keys
   * @see /api/templates/queries.ts
   */
  templates: {
    /**
     * Base key for all template queries
     */
    all: () => ['templates'] as const,

    /**
     * Get templates list with filters
     */
    lists: () => ['templates', 'list'] as const,

    /**
     * Get templates list with specific params
     */
    list: (params?: Record<string, unknown>) =>
      ['templates', 'list', params] as const,

    /**
     * Get single template by ID
     */
    detail: (id: number) => ['templates', 'detail', id] as const,

    /**
     * Get template reviews
     */
    reviews: (templateId: number) =>
      ['templates', 'reviews', templateId] as const,

    /**
     * Get template categories
     */
    categories: () => ['templates', 'categories'] as const,

    /**
     * Get template layouts
     */
    layouts: () => ['templates', 'layouts'] as const,

    /**
     * Get user's purchased templates
     */
    purchased: (boothId: string) => ['templates', 'purchased', boothId] as const,
  },
} as const;

