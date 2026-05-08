import { Hono } from 'hono'
import { issueNonce } from '../lib/nonces'

const auth = new Hono()

auth.get('/nonce', (c) => {
  const address = c.req.query('address')

  if (!address) {
    return c.json({ success: false, error: 'address query param is required' }, 400)
  }

  if (!address.startsWith('addr') && !address.startsWith('stake')) {
    return c.json({ success: false, error: 'Invalid Cardano address format' }, 400)
  }

  const { nonce, expiresAt } = issueNonce(address)
  return c.json({ success: true, data: { nonce, expiresAt } })
})

export default auth
