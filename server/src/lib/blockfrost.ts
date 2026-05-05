import { BlockFrostAPI } from '@blockfrost/blockfrost-js'

// Preprod testnet — switch to 'mainnet' before production launch
const NETWORK = 'preprod'

const projectId = process.env.BLOCKFROST_PROJECT_ID

if (!projectId) {
  console.warn(
    '[blockfrost] WARNING: BLOCKFROST_PROJECT_ID is not set or is still the placeholder.\n' +
    '  Copy server/.env.example → server/.env and add your Blockfrost preprod key.\n' +
    '  Get one free at https://blockfrost.io'
  )
}
export const blockfrost = new BlockFrostAPI({
  projectId: projectId ?? '',
  network: NETWORK,
})

/**
 * Health-check: confirms Blockfrost connectivity.
 * Called on server startup and exposed via GET /api/health.
 */
export async function checkBlockfrostHealth(): Promise<{
  ok: boolean
  network: string
  latestBlock?: number
  error?: string
}> {
  try {
    const latest = await blockfrost.blocksLatest()
    return { ok: true, network: NETWORK, latestBlock: latest.height ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, network: NETWORK, error: message }
  }
}
