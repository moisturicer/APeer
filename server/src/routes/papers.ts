import { Hono } from 'hono'
import { walletAuth } from '../middleware/auth'
import { pinFileToIPFS } from '../lib/pinata'
import { sha256Hex } from '../lib/sha256'
import { buildPaperMetadata } from '../lib/cip25'
import { track } from '../lib/txConfirmation'
import { config } from '../lib/env'
import {
  insertPaper,
  getPaperByCid,
  incrementViews,
  listPapers,
  setPaperTxPending,
} from '../lib/papers'
import type { HonoAppEnv, ReviewMode } from '../types'

const papers = new Hono<HonoAppEnv>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToResponse(row: ReturnType<typeof getPaperByCid>) {
  if (!row) return null
  return {
    id: row.cid,
    cid: row.cid,
    title: row.title,
    abstract: row.abstract,
    authors: row.authors.map((addr: string) => ({
      id: addr,
      address: addr,
      reputation: 0,
      badges: [] as string[],
    })),
    ipfsHash: row.cid,
    date: new Date(row.submitted_at).toISOString().split('T')[0],
    tags: row.tags,
    reviewMode: row.review_mode,
    status: row.status,
    confirmationStatus: row.confirmation_status,
    txHash: row.tx_hash,
    sha256: row.sha256,
    reviewCount: 0,  // Increment 3
    views: row.views,
    citations: 0,    // Increment 3+
    rewardPool: 0,   // Increment 3
  }
}

// ── GET /api/papers ───────────────────────────────────────────────────────────

papers.get('/', (c) => {
  const page = Number(c.req.query('page')) || 1
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100)
  const tag = c.req.query('tag')
  const author = c.req.query('author')
  const sort = (c.req.query('sort') as 'date' | 'views') ?? 'date'
  const q = c.req.query('q')

  const { papers: rows, total } = listPapers({ page, limit, tag, author, sort, q })

  return c.json({
    success: true,
    data: {
      papers: rows.map(r => rowToResponse(r)),
      total,
      page,
      limit,
    },
  })
})

// ── GET /api/papers/:cid ──────────────────────────────────────────────────────

papers.get('/:cid', (c) => {
  const cid = c.req.param('cid')
  const row = getPaperByCid(cid)

  if (!row) {
    return c.json({ success: false, error: 'Paper not found' }, 404)
  }

  incrementViews(cid)

  return c.json({
    success: true,
    data: { ...rowToResponse(row), reviews: [] },
  })
})

// ── POST /api/papers ──────────────────────────────────────────────────────────

papers.post('/', walletAuth(), async (c) => {
  const submitter = c.get('walletAddress')
  const body = c.get('rawBody')

  // Extract and validate multipart fields
  const fileField = body['file']
  if (!fileField || typeof fileField === 'string') {
    return c.json({ success: false, error: 'Missing PDF file field' }, 400)
  }
  const file = fileField as File

  if (!file.type.includes('pdf')) {
    return c.json({ success: false, error: 'File must be application/pdf' }, 400)
  }

  const maxBytes = config.maxPaperSizeMb * 1024 * 1024
  if (file.size > maxBytes) {
    return c.json(
      { success: false, error: `File exceeds maximum size of ${config.maxPaperSizeMb} MB` },
      400
    )
  }

  const title = body['title'] as string | undefined
  const abstract = body['abstract'] as string | undefined
  const authorsRaw = body['authors'] as string | undefined
  const tagsRaw = body['tags'] as string | undefined
  const reviewMode = (body['reviewMode'] as ReviewMode | undefined) ?? 'Open'

  if (!title || !abstract) {
    return c.json({ success: false, error: 'title and abstract are required' }, 400)
  }

  let authors: string[]
  let tags: string[]
  try {
    authors = authorsRaw ? (JSON.parse(authorsRaw) as string[]) : [submitter]
    tags = tagsRaw ? (JSON.parse(tagsRaw) as string[]) : []
  } catch {
    return c.json({ success: false, error: 'authors and tags must be JSON arrays' }, 400)
  }

  // Ensure submitter is in authors list
  if (!authors.includes(submitter)) authors = [submitter, ...authors]

  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    const fileHash = await sha256Hex(buffer)

    const { cid } = await pinFileToIPFS({
      filename: file.name || `paper-${Date.now()}.pdf`,
      buffer,
      metadata: { submitter, title },
    })

    const metadataObj = buildPaperMetadata({ cid, title, abstract, authors, tags, reviewMode })

    insertPaper({
      cid,
      title,
      abstract,
      authors,
      tags,
      review_mode: reviewMode,
      status: 'Awaiting Review',
      confirmation_status: 'pending_anchor',
      tx_hash: null,
      anchored_at: null,
      submitted_at: Date.now(),
      views: 0,
      sha256: fileHash,
    })

    return c.json({
      success: true,
      data: {
        cid,
        pinned: true,
        sha256: fileHash,
        metadataForTx: {
          label: '721',
          metadata: metadataObj,
        },
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[papers] POST error:', msg)
    return c.json({ success: false, error: msg }, 500)
  }
})

// ── POST /api/papers/:cid/confirm ────────────────────────────────────────────

papers.post('/:cid/confirm', walletAuth(), async (c) => {
  const cid = c.req.param('cid')
  const signer = c.get('walletAddress')
  const body = c.get('rawBody')

  const txHash = body['txHash'] as string | undefined
  if (!txHash) {
    return c.json({ success: false, error: 'txHash is required' }, 400)
  }

  const row = getPaperByCid(cid)
  if (!row) {
    return c.json({ success: false, error: 'Paper not found' }, 404)
  }

  // Signer must be the original submitter (authors[0])
  const primaryAuthor = row.authors[0]
  if (signer !== primaryAuthor) {
    return c.json({ success: false, error: 'Only the original submitter can confirm anchoring' }, 403)
  }

  if (row.confirmation_status !== 'pending_anchor') {
    return c.json(
      { success: false, error: `Paper is already in status: ${row.confirmation_status}` },
      409
    )
  }

  setPaperTxPending(cid, txHash)
  track(txHash, cid)

  return c.json({
    success: true,
    data: {
      cid,
      txHash,
      confirmationStatus: 'pending_confirmation',
      message: 'Anchoring transaction submitted; confirmation will be tracked automatically.',
    },
  })
})

export default papers
