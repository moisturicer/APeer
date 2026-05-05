import { Hono } from 'hono'
import { blockfrost } from '../lib/blockfrost'

const wallet = new Hono()

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
          note: 'Address has no transaction history yet',
        },
      })
    }
    return c.json({ success: false, error: message }, 500)
  }
})

export default wallet
