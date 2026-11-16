import { useState, useCallback } from 'react'
import type { FullNetworkInfo } from '../types/network'

interface UseNetworkInfoReturn {
  data: FullNetworkInfo | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useNetworkInfo(): UseNetworkInfoReturn {
  const [data, setData] = useState<FullNetworkInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await window.netfix.network.getAll()
      if (response.success && response.data) {
        setData(response.data as FullNetworkInfo)
      } else {
        setError(response.error ?? 'Failed to fetch network information')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, refresh }
}
