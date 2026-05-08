import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './env'

let _db: Database | null = null

export function getDb(): Database {
  if (!_db) throw new Error('DB not initialised — call migrate() first')
  return _db
}

export function migrate(): void {
  mkdirSync(dirname(config.databasePath), { recursive: true })

  _db = new Database(config.databasePath)
  _db.exec('PRAGMA journal_mode=WAL')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS papers (
      cid                 TEXT PRIMARY KEY,
      title               TEXT NOT NULL,
      abstract            TEXT NOT NULL,
      authors             TEXT NOT NULL,
      tags                TEXT NOT NULL,
      review_mode         TEXT NOT NULL DEFAULT 'Open',
      status              TEXT NOT NULL DEFAULT 'Awaiting Review',
      confirmation_status TEXT NOT NULL DEFAULT 'pending_anchor',
      tx_hash             TEXT,
      anchored_at         INTEGER,
      submitted_at        INTEGER NOT NULL,
      views               INTEGER NOT NULL DEFAULT 0,
      sha256              TEXT NOT NULL
    )
  `)

  _db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id               TEXT PRIMARY KEY,
      paper_cid        TEXT NOT NULL,
      reviewer_address TEXT NOT NULL,
      text             TEXT NOT NULL,
      reward_earned    REAL NOT NULL DEFAULT 0,
      helpful_votes    INTEGER NOT NULL DEFAULT 0,
      is_slashed       INTEGER NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL,
      FOREIGN KEY (paper_cid) REFERENCES papers(cid)
    )
  `)

  _db.exec(`
    CREATE TABLE IF NOT EXISTS auth_nonces (
      address    TEXT NOT NULL,
      nonce      TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (address, nonce)
    )
  `)
}
