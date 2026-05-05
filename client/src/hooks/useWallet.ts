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
      const rawAddress = addrs[0] ?? await w.getChangeAddress()
      const address = normalizeWalletAddress(rawAddress)
      setWallet(w)
      setState({ connected: true, connecting: false, address, name: walletName, error: null })
    } catch (e) {
      setState(s => ({
        ...s,
        connecting: false,
        error: toWalletErrorMessage(e),
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setWallet(null)
    setState({ connected: false, connecting: false, address: null, name: null, error: null })
  }, [])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
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

  return { ...state, wallet, connect, disconnect, clearError, getAvailableWallets }
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

function toWalletErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to connect wallet. Please try again.';
  }

  const message = error.message.toLowerCase();
  if (message.includes('user rejected') || message.includes('declined')) {
    return 'Wallet connection request was cancelled.';
  }
  if (message.includes('not available')) {
    return 'Selected wallet is unavailable. Open wallet extension and retry.';
  }
  if (message.includes('network')) {
    return 'Wallet network error. Verify extension is unlocked and online.';
  }

  return error.message;
}

function normalizeWalletAddress(rawAddress: string): string {
  if (rawAddress.startsWith('addr') || rawAddress.startsWith('stake')) {
    return rawAddress;
  }

  try {
    const bytes = hexToBytes(rawAddress);
    return toCardanoBech32(bytes);
  } catch {
    return rawAddress;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const sanitized = hex.trim().toLowerCase();
  if (sanitized.length === 0 || sanitized.length % 2 !== 0) {
    throw new Error('Invalid hex address payload');
  }
  if (!/^[0-9a-f]+$/.test(sanitized)) {
    throw new Error('Invalid hex characters in address');
  }

  const byteCount = Math.floor(sanitized.length / 2);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i += 1) {
    const offset = i * 2;
    bytes[i] = Number.parseInt(sanitized.slice(offset, offset + 2), 16);
  }
  return bytes;
}

function toCardanoBech32(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    throw new Error('Empty address bytes');
  }
  const addressType = bytes[0] >> 4;
  const hrp = addressType === 14 || addressType === 15 ? 'stake' : 'addr';
  return bech32Encode(hrp, bytes);
}

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Encode(hrp: string, data: Uint8Array): string {
  const words = convertBits(data, 8, 5, true);
  const checksum = createChecksum(hrp, words);
  const combined = [...words, ...checksum];
  const encoded = combined.map((v) => BECH32_CHARSET[v]).join('');
  return `${hrp}1${encoded}`;
}

function convertBits(data: Uint8Array, from: number, to: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << to) - 1;

  for (const value of data) {
    if (value < 0 || (value >> from) !== 0) {
      throw new Error('Invalid value for bit conversion');
    }
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (to - bits)) & maxv);
    }
  } else if (bits >= from || ((acc << (to - bits)) & maxv) !== 0) {
    throw new Error('Invalid padding');
  }

  return result;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(values) ^ 1;
  const checksum: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    checksum.push((polymod >> (5 * (5 - i))) & 31);
  }
  return checksum;
}

function hrpExpand(hrp: string): number[] {
  const high: number[] = [];
  const low: number[] = [];
  for (const char of hrp) {
    const code = char.codePointAt(0) ?? 0;
    high.push(code >> 5);
    low.push(code & 31);
  }
  return [...high, 0, ...low];
}

function bech32Polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;

  for (const value of values) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) {
      if (((top >> i) & 1) !== 0) {
        checksum ^= generators[i];
      }
    }
  }

  return checksum;
}
