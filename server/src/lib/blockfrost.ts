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

  if (msg.includes('404')) {
    return { status: 404, message: 'Address or resource not found on chain' }
  }
  if (msg.includes('402') || msg.includes('429')) {
    return { status: 503, message: 'Blockchain indexer temporarily unavailable' }
  }
  if (msg.includes('503')) {
    return { status: 503, message: 'Blockchain indexer temporarily unavailable' }
  }
  if (msg.includes('502') || msg.includes('500')) {
    return { status: 502, message: 'Blockchain indexer error' }
  }
  if (msg.includes('504') || msg.toLowerCase().includes('timeout')) {
    return { status: 504, message: 'Blockchain indexer timeout' }
  }

  return { status: 502, message: 'Blockchain indexer error' }
}

export function logBlockfrostError(context: {
  operation: string
  address?: string
  txHash?: string
  error: unknown
}): void {
  const details = {
    operation: context.operation,
    address: context.address,
    txHash: context.txHash,
    timestamp: new Date().toISOString(),
    rawError: context.error instanceof Error ? context.error.message : String(context.error),
  }
  console.error('[blockfrost] request failed', details)
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
    logBlockfrostError({ operation: 'blocksLatest(health)', error: err })
    const { message } = mapBlockfrostError(err)
    return { ok: false, network: NETWORK, error: message }
  }
}
