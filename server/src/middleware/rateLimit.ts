import { createMiddleware } from 'hono/factory'

interface Bucket {
  tokens: number
  lastRefill: number
}

interface BucketConfig {
  maxTokens: number
  refillMs: number   // window in ms
}

function makeLimiter(config: BucketConfig) {
  const buckets = new Map<string, Bucket>()

  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('cf-connecting-ip')
      ?? 'unknown'

    const now = Date.now()
    let bucket = buckets.get(ip)

    if (!bucket || now - bucket.lastRefill >= config.refillMs) {
      bucket = { tokens: config.maxTokens, lastRefill: now }
    }

    if (bucket.tokens <= 0) {
      buckets.set(ip, bucket)
      return c.json(
        { success: false, error: 'Too many requests — please slow down' },
        429
      )
    }

    bucket.tokens--
    buckets.set(ip, bucket)
    await next()
  })
}

// Named buckets per SRS §7.1
export const rateLimits = {
  // 60 GET requests / min / IP
  getDefault: makeLimiter({ maxTokens: 60, refillMs: 60_000 }),
  // 5 POST /papers submissions / min / IP (wallet-gated, but IP-rate as fallback)
  postPapers: makeLimiter({ maxTokens: 5, refillMs: 60_000 }),
  // 10 nonce requests / min / IP
  nonce: makeLimiter({ maxTokens: 10, refillMs: 60_000 }),
  // 20 other POST requests / min / IP
  postOther: makeLimiter({ maxTokens: 20, refillMs: 60_000 }),
}
