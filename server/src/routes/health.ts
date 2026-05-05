import { Hono } from 'hono'
import { checkBlockfrostHealth } from '../lib/blockfrost'

const health = new Hono()

/**
 * GET /api/health
 * Returns server status and Blockfrost connectivity.
 * Used by QA to verify the environment is wired correctly.
 */
health.get('/', async (c) => {
  const blockfrostStatus = await checkBlockfrostHealth()

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    network: 'cardano-preprod',
    services: {
      blockfrost: blockfrostStatus,
    },
  })
})

export default health
