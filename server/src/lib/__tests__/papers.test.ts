import { describe, it, expect, beforeEach } from 'bun:test'
import { migrate } from '../db'
import { config } from '../env'
import { insertPaper, getPaperByCid, listPapers, incrementViews, setAnchorTx } from '../papers'

// Each test gets a fresh in-memory DB
beforeEach(() => {
  Object.assign(config, { databasePath: ':memory:' })
  migrate()
})

function makePaper(overrides: Partial<Parameters<typeof insertPaper>[0]> = {}) {
  return {
    cid: `bafytest${Math.random().toString(36).slice(2)}`,
    title: 'Test Paper',
    abstract: 'A test abstract.',
    authors: ['addr_test1'],
    tags: ['Cardano', 'Testing'],
    review_mode: 'Open' as const,
    status: 'Awaiting Review' as const,
    confirmation_status: 'confirmed' as const,
    tx_hash: 'abc123txhash',
    anchored_at: Date.now(),
    submitted_at: Date.now(),
    views: 0,
    sha256: 'deadbeef'.repeat(8),
    ...overrides,
  }
}

describe('insertPaper / getPaperByCid', () => {
  it('round-trips a paper through the DB', () => {
    const paper = makePaper()
    insertPaper(paper)
    const retrieved = getPaperByCid(paper.cid)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.title).toBe(paper.title)
    expect(retrieved!.authors).toEqual(['addr_test1'])
    expect(retrieved!.tags).toEqual(['Cardano', 'Testing'])
  })

  it('returns null for unknown CID', () => {
    expect(getPaperByCid('bafynonexistent')).toBeNull()
  })
})

describe('listPapers', () => {
  it('returns only confirmed papers', () => {
    insertPaper(makePaper({ confirmation_status: 'confirmed' }))
    insertPaper(makePaper({ confirmation_status: 'pending_anchor' }))
    const { papers, total } = listPapers()
    expect(total).toBe(1)
    expect(papers).toHaveLength(1)
  })

  it('filters by tag', () => {
    insertPaper(makePaper({ tags: ['Cardano'] }))
    insertPaper(makePaper({ tags: ['UTXO'] }))
    const { papers } = listPapers({ tag: 'Cardano' })
    expect(papers).toHaveLength(1)
    expect(papers[0].tags).toContain('Cardano')
  })

  it('filters by author address', () => {
    insertPaper(makePaper({ authors: ['addr_alice'] }))
    insertPaper(makePaper({ authors: ['addr_bob'] }))
    const { papers } = listPapers({ author: 'addr_alice' })
    expect(papers).toHaveLength(1)
  })

  it('paginates correctly', () => {
    for (let i = 0; i < 5; i++) insertPaper(makePaper())
    const page1 = listPapers({ page: 1, limit: 3 })
    const page2 = listPapers({ page: 2, limit: 3 })
    expect(page1.total).toBe(5)
    expect(page1.papers).toHaveLength(3)
    expect(page2.papers).toHaveLength(2)
  })

  it('searches title and abstract', () => {
    insertPaper(makePaper({ title: 'Unique Keyword Alpha' }))
    insertPaper(makePaper({ title: 'Other paper' }))
    const { papers } = listPapers({ q: 'Alpha' })
    expect(papers).toHaveLength(1)
  })
})

describe('incrementViews', () => {
  it('increments view count', () => {
    const paper = makePaper()
    insertPaper(paper)
    incrementViews(paper.cid)
    incrementViews(paper.cid)
    const updated = getPaperByCid(paper.cid)
    expect(updated!.views).toBe(2)
  })
})

describe('setAnchorTx', () => {
  it('sets tx_hash, anchored_at and flips confirmation_status to confirmed', () => {
    const paper = makePaper({ confirmation_status: 'pending_confirmation', tx_hash: null })
    insertPaper(paper)
    const now = Date.now()
    setAnchorTx(paper.cid, 'newtxhash', now)
    const updated = getPaperByCid(paper.cid)
    expect(updated!.tx_hash).toBe('newtxhash')
    expect(updated!.confirmation_status).toBe('confirmed')
    expect(updated!.anchored_at).toBe(now)
  })
})
