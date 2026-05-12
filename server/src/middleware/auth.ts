import { createMiddleware } from 'hono/factory'
import { consumeNonce, isNonceAvailable } from '../lib/nonces'
import { verifyCip30Signature } from '../lib/auth'
import type { HonoAppEnv } from '../types'

export function walletAuth() {
  return createMiddleware<HonoAppEnv>(async (c, next) => {
    const contentType = c.req.header('content-type') ?? ''

    let rawBody: Record<string, string | File>
    let address: string | undefined
    let nonce: string | undefined
    let signature: string | undefined
    let key: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const parsed = await c.req.parseBody()
      rawBody = parsed as Record<string, string | File>
      address = rawBody['walletAddress'] as string | undefined
      nonce = rawBody['nonce'] as string | undefined
      signature = rawBody['signature'] as string | undefined
      key = rawBody['key'] as string | undefined
    } else {
      let json: Record<string, string> = {}
      try {
        json = (await c.req.json()) as Record<string, string>
      } catch {
        return c.json({ success: false, error: 'Invalid JSON body' }, 400)
      }
      rawBody = json
      address = json['walletAddress']
      nonce = json['nonce']
      signature = json['signature']
      key = json['key']
    }

    if (!address || !nonce || !signature || !key) {
      return c.json(
        { success: false, error: 'Missing auth fields: walletAddress, nonce, signature, key' },
        401
      )
    }

    if (!isNonceAvailable(address, nonce)) {
      return c.json({ success: false, error: 'Invalid, expired, or already-used nonce' }, 401)
    }

    const valid = await verifyCip30Signature({ address, nonce, signature, key })
    if (!valid) {
      return c.json({ success: false, error: 'Signature verification failed' }, 401)
    }

    if (!consumeNonce(address, nonce)) {
      return c.json({ success: false, error: 'Invalid, expired, or already-used nonce' }, 401)
    }

    c.set('walletAddress', address)
    c.set('rawBody', rawBody)
    await next()
  })
}
