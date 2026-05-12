import { getDb } from './db'
import type { PaperRow, PaperStatus, ConfirmationStatus } from '../types'

// ── DB row shape (raw SQLite — arrays stored as JSON strings) ──────────────

interface RawRow {
  cid: string
  title: string
  abstract: string
  authors: string          // JSON
  tags: string             // JSON
  review_mode: string
  status: string
  confirmation_status: string
  tx_hash: string | null
  anchored_at: number | null
  submitted_at: number
  views: number
  sha256: string
}

function deserialize(raw: RawRow): PaperRow {
  return {
    cid: raw.cid,
    title: raw.title,
    abstract: raw.abstract,
    authors: JSON.parse(raw.authors) as string[],
    tags: JSON.parse(raw.tags) as string[],
    review_mode: raw.review_mode as PaperRow['review_mode'],
    status: raw.status as PaperStatus,
    confirmation_status: raw.confirmation_status as ConfirmationStatus,
    tx_hash: raw.tx_hash,
    anchored_at: raw.anchored_at,
    submitted_at: raw.submitted_at,
    views: raw.views,
    sha256: raw.sha256,
  }
}

// ── Write operations ──────────────────────────────────────────────────────────

export function insertPaper(row: PaperRow): void {
  getDb().run(
    `INSERT INTO papers
       (cid, title, abstract, authors, tags, review_mode, status, confirmation_status,
        tx_hash, anchored_at, submitted_at, views, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.cid,
      row.title,
      row.abstract,
      JSON.stringify(row.authors),
      JSON.stringify(row.tags),
      row.review_mode,
      row.status,
      row.confirmation_status,
      row.tx_hash,
      row.anchored_at,
      row.submitted_at,
      row.views,
      row.sha256,
    ]
  )
}

export function setAnchorTx(cid: string, txHash: string, anchoredAt: number): void {
  getDb().run(
    `UPDATE papers
     SET tx_hash = ?,
         anchored_at = ?,
         confirmation_status = 'confirmed',
         status = 'Awaiting Review'
     WHERE cid = ?`,
    [txHash, anchoredAt, cid]
  )
}

export function setPaperConfirmationStatus(cid: string, status: ConfirmationStatus): void {
  getDb().run('UPDATE papers SET confirmation_status = ? WHERE cid = ?', [status, cid])
}

export function setPaperTxPending(cid: string, txHash: string): void {
  getDb().run(
    `UPDATE papers SET tx_hash = ?, confirmation_status = 'pending_confirmation' WHERE cid = ?`,
    [txHash, cid]
  )
}

export function incrementViews(cid: string): void {
  getDb().run('UPDATE papers SET views = views + 1 WHERE cid = ?', [cid])
}

// ── Read operations ───────────────────────────────────────────────────────────

export function getPaperByCid(cid: string): PaperRow | null {
  const raw = getDb()
    .query<RawRow, [string]>('SELECT * FROM papers WHERE cid = ?')
    .get(cid)
  return raw ? deserialize(raw) : null
}

export function getPaperBySha256(sha256: string): PaperRow | null {
  const raw = getDb()
    .query<RawRow, [string]>('SELECT * FROM papers WHERE sha256 = ?')
    .get(sha256)
  return raw ? deserialize(raw) : null
}

export function listPendingConfirmation(): Array<{ cid: string; tx_hash: string | null }> {
  return getDb()
    .query<{ cid: string; tx_hash: string | null }, []>(
      `SELECT cid, tx_hash FROM papers WHERE confirmation_status = 'pending_confirmation'`
    )
    .all()
}

export interface ListPapersOptions {
  page?: number
  limit?: number
  tag?: string
  author?: string
  status?: PaperStatus
  sort?: 'date' | 'views'
  q?: string
}

export function listPapers(opts: ListPapersOptions = {}): { papers: PaperRow[]; total: number } {
  const db = getDb()
  const { page = 1, limit = 20, tag, author, status, sort = 'date', q } = opts

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (tag) {
    conditions.push(`EXISTS (SELECT 1 FROM json_each(papers.tags) WHERE value = ?)`)
    params.push(tag)
  }
  if (author) {
    conditions.push(`EXISTS (SELECT 1 FROM json_each(papers.authors) WHERE value = ?)`)
    params.push(author)
  }
  if (status) {
    conditions.push('papers.status = ?')
    params.push(status)
  }
  if (q) {
    conditions.push('(papers.title LIKE ? OR papers.abstract LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = sort === 'views' ? 'views DESC' : 'submitted_at DESC'
  const offset = (page - 1) * limit

  const total =
    db
      .query<{ count: number }, (string | number)[]>(
        `SELECT COUNT(*) as count FROM papers ${where}`
      )
      .get(...params)?.count ?? 0

  const rows = db
    .query<RawRow, (string | number)[]>(
      `SELECT * FROM papers ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)

  return { papers: rows.map(deserialize), total }
}
