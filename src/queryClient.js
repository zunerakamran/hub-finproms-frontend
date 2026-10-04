import { QueryClient } from '@tanstack/react-query'

/**
 * Shared client for boot/session APIs — dedupes StrictMode + remount fetches.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const authQueryKey = ['auth', 'me']
/** Shared prefetch while /auth/me is in flight (no user-specific rights yet). */
export const hubBootQueryKey = ['hub', 'current', 'boot']
export const hubQueryKey = (userId = 'guest') => ['hub', 'current', userId]
