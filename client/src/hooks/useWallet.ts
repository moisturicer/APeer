import { useState, useCallback } from 'react'

export interface WalletState {
  connected: boolean
  connecting: boolean
  address: string | null
  name: string | null
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    name: null,
    error: null,
  })
  const [wallet, setWallet] = useState<Cip30Api | null>(null)

  const connect = useCallback(async (walletName: string) => {
    setState(s => ({ ...s, connecting: true, error: null }))
    try {
      const provider = getCardanoProvider(walletName)
      if (!provider) {
        throw new Error(`Wallet "${walletName}" is not available`)
      }
      const w = await provider.enable()
      const addrs = await w.getUsedAddresses()
      const address = addrs[0] ?? await w.getChangeAddress()
      setWallet(w)
      setState({ connected: true, connecting: false, address, name: walletName, error: null })
    } catch (e) {
      setState(s => ({
        ...s,
        connecting: false,
        error: e instanceof Error ? e.message : 'Failed to connect wallet',
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setWallet(null)
    setState({ connected: false, connecting: false, address: null, name: null, error: null })
  }, [])

  const getAvailableWallets = useCallback(async () => {
    const cardano = getCardanoWindow()
    if (!cardano) return []

    const entries: { id: string; name: string; icon: string }[] = []
    for (const [id, value] of Object.entries(cardano)) {
      if (!isWalletProvider(value)) continue
      entries.push({
        id,
        name: value.name ?? id,
        icon: value.icon ?? '',
      })
    }

    return entries
  }, [])

  return { ...state, wallet, connect, disconnect, getAvailableWallets }
}

interface Cip30Api {
  getUsedAddresses(): Promise<string[]>
  getChangeAddress(): Promise<string>
}

interface Cip30Provider {
  enable(): Promise<Cip30Api>
  name?: string
  icon?: string
}

type CardanoWindow = Record<string, unknown>

function getCardanoWindow(): CardanoWindow | undefined {
  if (globalThis.window === undefined) return undefined
  return (globalThis.window as Window & { cardano?: CardanoWindow }).cardano
}

function getCardanoProvider(walletName: string): Cip30Provider | null {
  const cardano = getCardanoWindow()
  const candidate = cardano?.[walletName]
  return isWalletProvider(candidate) ? candidate : null
}

function isWalletProvider(candidate: unknown): candidate is Cip30Provider {
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      'enable' in candidate &&
      typeof (candidate as { enable?: unknown }).enable === 'function',
  )
}
