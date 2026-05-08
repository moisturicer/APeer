import type {
  Paper,
  WalletInfo,
  ApiResponse,
  NonceResponse,
  SubmitPaperResponse,
  ConfirmPaperResponse,
  PapersListResponse,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const BASE = API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, '')}/api` : '/api'

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, init)

    if (!res.ok) {
      const err = await res.text()
      return { status: res.status, error: err || res.statusText }
    }

    const raw = (await res.json()) as unknown

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

function jsonRequest<T>(path: string, body: unknown, method = 'POST'): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  wallet: (address: string) => request<WalletInfo>(`/wallet/${address}`),

  // Auth
  getNonce: (address: string) =>
    request<NonceResponse>(`/auth/nonce?address=${encodeURIComponent(address)}`),

  // Papers — list with optional filters
  papers: (params?: {
    tag?: string
    author?: string
    page?: number
    limit?: number
    sort?: 'date' | 'views'
    q?: string
  }) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : ''
    return request<PapersListResponse>(`/papers${qs}`)
  },

  // GET single paper by CID
  getPaper: (cid: string) => request<Paper & { reviews: [] }>(`/papers/${cid}`),

  // POST /papers — multipart upload with auth fields
  submitPaper: (formData: FormData) =>
    request<SubmitPaperResponse>('/papers', {
      method: 'POST',
      body: formData,
      // No Content-Type header — browser sets it with boundary for multipart
    }),

  // POST /papers/:cid/confirm — JSON body with auth fields
  confirmPaper: (
    cid: string,
    body: {
      txHash: string
      walletAddress: string
      nonce: string
      signature: string
      key: string
    }
  ) => jsonRequest<ConfirmPaperResponse>(`/papers/${cid}/confirm`, body),
}
