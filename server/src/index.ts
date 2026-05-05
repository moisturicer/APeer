import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import healthRoute from './routes/health'
import walletRoute from './routes/wallet'
import papersRoute from './routes/papers'

const app = new Hono()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use('*', logger())
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173'], // Vite dev server
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// ── Routes ─────────────────────────────────────────────────────────────────
app.route('/api/health', healthRoute)
app.route('/api/wallet', walletRoute)
app.route('/api/papers', papersRoute)

// ── Root ───────────────────────────────────────────────────────────────────
app.get('/', (c) =>
  c.json({ name: 'APeer API', version: '0.1.0', docs: '/api/health' })
)

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000

console.log(`
  ┌─────────────────────────────────────────┐
  │   APeer API Server                      │
  │   http://localhost:${PORT}                 │
  │                                         │
  │   Network: Cardano preprod              │
  │   GET /api/health  → connectivity check │
  │   GET /api/wallet/:address → ADA bal    │
  │   GET /api/papers  → paper index (stub) │
  └─────────────────────────────────────────┘
`)

export default {
  port: PORT,
  fetch: app.fetch,
}
