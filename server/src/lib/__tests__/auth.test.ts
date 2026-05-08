import { describe, it, expect } from 'bun:test'
import { verifyCip30Signature } from '../auth'

/**
 * Note: full round-trip CIP-30 signature tests require a live wallet or
 * the @meshsdk/core-cst key-generation utilities. The tests here verify
 * that tampered/empty inputs are correctly rejected and that the function
 * returns a boolean without throwing.
 *
 * Integration tests against a real preprod wallet belong in the QA checklist.
 */

describe('verifyCip30Signature', () => {
  it('returns false (not throws) for empty signature fields', async () => {
    const result = await verifyCip30Signature({
      address: 'addr_test1qp3a4',
      nonce: 'test-nonce',
      signature: '',
      key: '',
    })
    expect(result).toBe(false)
  })

  it('returns false for garbage signature data', async () => {
    const result = await verifyCip30Signature({
      address: 'addr_test1qp3a4',
      nonce: 'test-nonce',
      signature: 'notvalidhex',
      key: 'notvalidhex',
    })
    expect(result).toBe(false)
  })

  it('returns false for mismatched address', async () => {
    const result = await verifyCip30Signature({
      address: 'addr_test1_wrong',
      nonce: 'test-nonce',
      signature: 'deadbeef',
      key: 'deadbeef',
    })
    expect(result).toBe(false)
  })
})
