import { Hono } from 'hono'
import { getAddress, mapBlockfrostError } from '../lib/blockfrost'

const wallet = new Hono()

wallet.get('/:address', async (c) => {
  const address = c.req.param('address')

  if (!address.startsWith('addr') && !address.startsWith('stake')) {
    return c.json({ success: false, error: 'Invalid Cardano address format' }, 400)
  }

  try {
    const info = await getAddress(address)

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
      },
    })
  } catch (err) {
    const { status, message } = mapBlockfrostError(err)
    if (status === 404) {
      return c.json({
        success: true,
        data: {
          address,
          balance: { lovelace: '0', ada: '0', peerA: '0' },
          stakeAddress: null,
          network: 'preprod',
          note: 'Address has no transaction history yet',
        },
      })
    }
    console.error('[wallet] Blockfrost error:', message)
    return c.json({ success: false, error: message }, status as 400 | 500 | 502 | 503 | 504)
  }
})

export default wallet
