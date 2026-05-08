import { BlockFrostAPI } from '@blockfrost/blockfrost-js'
import { TtlCache } from './cache'

export const NETWORK = 'preprod'

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

// ── TTL caches ────────────────────────────────────────────────────────────────
// Per SRS §4.4: address 30 s, latest block 10 s, tx 60 s

const addressCache = new TtlCache<string, Awaited<ReturnType<typeof blockfrost.addresses>>>()
const blockCache = new TtlCache<'latest', Awaited<ReturnType<typeof blockfrost.blocksLatest>>>()
const txCache = new TtlCache<string, Awaited<ReturnType<typeof blockfrost.txs>>>()

export async function getAddress(address: string) {
  return addressCache.getOrCompute(address, 30_000, () => blockfrost.addresses(address))
}

export async function getBlocksLatest() {
  return blockCache.getOrCompute('latest', 10_000, () => blockfrost.blocksLatest())
}

export async function getTx(txHash: string) {
  return txCache.getOrCompute(txHash, 60_000, () => blockfrost.txs(txHash))
}

// ── Error mapping ─────────────────────────────────────────────────────────────

export function mapBlockfrostError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('404')) return { status: 404, message: 'Not found on Blockfrost' }
  if (msg.includes('503')) return { status: 503, message: 'Blockfrost service unavailable' }
  if (msg.includes('502')) return { status: 502, message: 'Blockfrost bad gateway' }
  if (msg.includes('504')) return { status: 504, message: 'Blockfrost gateway timeout' }
  return { status: 500, message: msg }
}

// ── Health check (existing) ───────────────────────────────────────────────────

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
