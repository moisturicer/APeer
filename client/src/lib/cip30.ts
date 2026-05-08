import { BrowserWallet } from '@meshsdk/core'

function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str), b => b.toString(16).padStart(2, '0')).join('')
}

export interface DataSignature {
  signature: string
  key: string
}

/**
 * Signs a nonce string with the connected wallet using CIP-30 signData.
 * The nonce is UTF-8 encoded to hex before signing, matching the server's
 * verifyCip30Signature expectation.
 */
export async function signNonce(walletName: string, address: string, nonce: string): Promise<DataSignature> {
  // BrowserWallet.enable() reuses the existing session — no second permission prompt
  const wallet = await BrowserWallet.enable(walletName)
  // BrowserWallet.signData(payload, address?) — payload first
  return wallet.signData(toHex(nonce), address)
}
