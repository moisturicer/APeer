import { Hono } from 'hono'

const papers = new Hono()

/**
 * Papers routes — stubbed for Increment 1.
 * Full IPFS submission and on-chain anchoring logic
 * will be implemented in Increment 2.
 */

/**
 * GET /api/papers
 * Returns a list of published papers (stubbed).
 */
papers.get('/', (c) => {
  return c.json({
    success: true,
    data: [],
    note: 'Paper indexing not yet implemented — coming in Increment 2',
  })
})

/**
 * GET /api/papers/:cid
 * Returns metadata for a paper by its IPFS CID (stubbed).
 */
papers.get('/:cid', (c) => {
  const cid = c.req.param('cid')
  return c.json({
    success: false,
    error: `Paper lookup by CID (${cid}) not yet implemented`,
  }, 501)
})

export default papers
