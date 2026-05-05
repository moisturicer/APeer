import { Hono } from 'hono'
import { blockfrost } from '../lib/blockfrost'

const wallet = new Hono()
const BLOCKFROST_BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0'

/**
 * GET /api/wallet/:address
 * Returns ADA balance and basic info for a given Cardano address.
 * The frontend uses this to display wallet state after CIP-30 connection.
 *
 * Note: peerA token balance will be added here once the token is deployed.
 */
wallet.get('/:address', async (c) => {
  const address = c.req.param('address')

  // Basic bech32 sanity check — real validation happens on-chain
  if (!address.startsWith('addr') && !address.startsWith('stake')) {
    return c.json({ success: false, error: 'Invalid Cardano address format' }, 400)
  }

  try {
    const info = await blockfrost.addresses(address)

    // Sum lovelace from UTxOs
    const lovelace =
      info.amount.find((a) => a.unit === 'lovelace')?.quantity ?? '0'

    // peerA balance — placeholder until token policy ID is confirmed
    const peerA =
      info.amount.find((a) => a.unit.includes('peerA'))?.quantity ?? '0'
    const transactions = await getRecentTransactions(address)

    return c.json({
      success: true,
      data: {
        address,
        balance: {
          lovelace,
          ada: (BigInt(lovelace) / 1_000_000n).toString(),
          peerA,
        },
        stakeAddress: info.stake_address,
        network: 'preprod',
        transactions,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Blockfrost returns 404 for addresses with no transactions yet
    if (message.includes('404')) {
      return c.json({
        success: true,
        data: {
          address,
          balance: { lovelace: '0', ada: '0', peerA: '0' },
          stakeAddress: null,
          network: 'preprod',
          transactions: [],
          note: 'Address has no transaction history yet',
        },
      })
    }
    return c.json({ success: false, error: message }, 500)
  }
})

export default wallet

interface BlockfrostTx {
  tx_hash: string
  block_height: number
  block_time: number
}

async function getRecentTransactions(address: string): Promise<Array<{
  txHash: string
  blockHeight: number
  blockTime: string
}>> {
  const projectId = process.env.BLOCKFROST_PROJECT_ID
  if (!projectId) return []

  try {
    const url = `${BLOCKFROST_BASE_URL}/addresses/${address}/transactions?count=10&page=1&order=desc`
    const res = await fetch(url, {
      headers: {
        project_id: projectId,
      },
    })
    if (!res.ok) {
      return []
    }

    const body = (await res.json()) as BlockfrostTx[]
    return body.map((tx) => ({
      txHash: tx.tx_hash,
      blockHeight: tx.block_height,
      blockTime: new Date(tx.block_time * 1000).toISOString(),
    }))
  } catch {
    return []
  }
}
