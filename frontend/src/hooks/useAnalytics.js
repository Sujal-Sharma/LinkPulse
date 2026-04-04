import { useQuery } from 'react-query'
import { analyticsApi } from '../services/api'

export function useAnalyticsOverview() {
  return useQuery(
    ['analytics', 'overview'],
    async () => {
      const { data } = await analyticsApi.overview()
      return data
    },
    { staleTime: 60000 }
  )
}

export function useLinkAnalyticsData(shortCode, period = '30d') {
  return useQuery(
    ['analytics', shortCode, period],
    async () => {
      const { data } = await analyticsApi.link(shortCode, period)
      return data
    },
    {
      enabled: !!shortCode,
      staleTime: 5000,
      refetchInterval: 10000,
      keepPreviousData: true,
    }
  )
}

export function useRealtimeStats(shortCode) {
  return useQuery(
    ['analytics', shortCode, 'realtime'],
    async () => {
      const { data } = await analyticsApi.realtime(shortCode)
      return data
    },
    {
      enabled: !!shortCode,
      refetchInterval: 10000,  // poll every 10s as fallback to socket
      staleTime: 5000,
    }
  )
}
