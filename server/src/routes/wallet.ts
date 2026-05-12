import { Hono } from 'hono'
import { getAddress, logBlockfrostError, mapBlockfrostError } from '../lib/blockfrost'

const wallet = new Hono()
const BLOCKFROST_BASE_URL = 'https://cardano-preprod.blockfrost.io/api/v0'

wallet.get('/:address', async (c) => {
  const address = c.req.param('address')

  if (!address.startsWith('addr') && !address.startsWith('stake')) {
    return c.json({ success: false, error: 'Invalid Cardano address format' }, 400)
  }

  try {
    const info = await getAddress(address)
    const transactions = await getRecentTransactions(address)

    const lovelace = info.amount.find((a) => a.unit === 'lovelace')?.quantity ?? '0'
    const peerA = info.amount.find((a) => a.unit.includes('peerA'))?.quantity ?? '0'

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
    const { status, message } = mapBlockfrostError(err)
    logBlockfrostError({ operation: 'addresses(walletRoute)', address, error: err })
    if (status === 404) {
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
    return c.json({ success: false, error: message }, status as 400 | 500 | 502 | 503 | 504)
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
