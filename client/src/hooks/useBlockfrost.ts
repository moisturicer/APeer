import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { WalletInfo } from '@/types'

export function useWalletInfo(address: string | null) {
  const [data, setData] = useState<WalletInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    api.wallet(address).then(res => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else setData(res.data ?? null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [address])

  return { data, loading, error }
}
