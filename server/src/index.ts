import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { migrate } from './lib/db'
import { rehydrate } from './lib/txConfirmation'
import { rateLimits } from './middleware/rateLimit'
import { config } from './lib/env'
import healthRoute from './routes/health'
import walletRoute from './routes/wallet'
import papersRoute from './routes/papers'
import authRoute from './routes/auth'

// Boot sequence — must happen before any request
migrate()
rehydrate()

const app = new Hono()

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use('*', logger())

const allowedOrigins =
  config.nodeEnv === 'production' && config.allowedOrigin
    ? [config.allowedOrigin]
    : ['http://localhost:5173']

app.use(
  '/api/*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// ── Rate limiting ──────────────────────────────────────────────────────────────
app.use('/api/auth/nonce', rateLimits.nonce)
app.use('/api/papers', async (c, next) => {
  if (c.req.method === 'POST') return rateLimits.postPapers(c, next)
  return rateLimits.getDefault(c, next)
})
app.use('/api/papers/*', async (c, next) => {
  if (c.req.method === 'POST') return rateLimits.postOther(c, next)
  return rateLimits.getDefault(c, next)
})
app.use('/api/wallet/*', rateLimits.getDefault)

// ── Routes ────────────────────────────────────────────────────────────────────
app.route('/api/health', healthRoute)
app.route('/api/wallet', walletRoute)
app.route('/api/papers', papersRoute)
app.route('/api/auth', authRoute)

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (c) =>
  c.json({ name: 'APeer API', version: '0.2.0', docs: '/api/health' })
)

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = config.port

console.log(`
  ┌──────────────────────────────────────────────────┐
  │   APeer API Server — Increment 2                 │
  │   http://localhost:${PORT}                          │
  │                                                  │
  │   Network: Cardano preprod                       │
  │   GET  /api/health           → health check      │
  │   GET  /api/wallet/:address  → ADA balance       │
  │   GET  /api/auth/nonce       → CIP-30 nonce      │
  │   GET  /api/papers           → paper index       │
  │   GET  /api/papers/:cid      → paper by CID      │
  │   POST /api/papers           → submit paper      │
  │   POST /api/papers/:cid/confirm → anchor tx      │
  └──────────────────────────────────────────────────┘
`)

export default {
  port: PORT,
  fetch: app.fetch,
}
