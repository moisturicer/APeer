import type { Paper, WalletInfo, ApiResponse } from '@/types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) {
      const err = await res.text()
      return { status: res.status, error: err || res.statusText }
    }
    const raw = await res.json() as unknown

    if (raw && typeof raw === 'object') {
      const envelope = raw as { success?: boolean; data?: T; error?: string }
      if (envelope.success === false) {
        return { status: res.status, error: envelope.error || 'Request failed' }
      }
      if (envelope.data !== undefined) {
        return { status: res.status, data: envelope.data }
      }
    }

    return { status: res.status, data: raw as T }
  } catch (e) {
    return { status: 0, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  wallet: (address: string) => request<WalletInfo>(`/wallet/${address}`),
  papers: (params?: { tag?: string; author?: string; page?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return request<Paper[]>(`/papers${qs}`)
  },
  submitPaper: (payload: {
    title: string
    abstract: string
    authors: string[]
    ipfsHash: string
    tags: string[]
    walletAddress: string
  }) => request<{ txHash: string }>('/papers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
