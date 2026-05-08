import { checkSignature } from '@meshsdk/core'

interface VerifyParams {
  address: string
  nonce: string
  signature: string
  key: string
}

function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str), b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyCip30Signature({ address, nonce, signature, key }: VerifyParams): Promise<boolean> {
  try {
    // CIP-30 signData payload is the UTF-8 nonce encoded as hex
    return await checkSignature(toHex(nonce), { key, signature }, address)
  } catch (err) {
    console.warn('[auth] Signature verification error', {
      address,
      reason: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}
