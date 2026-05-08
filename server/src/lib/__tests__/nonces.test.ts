import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { issueNonce, consumeNonce } from '../nonces'

// ── Bootstrap an in-memory DB for tests ─────────────────────────────────────

function setupTestDb() {
  // Patch getDb to return an in-memory DB
  const db = new Database(':memory:')
  db.exec('PRAGMA journal_mode=WAL')
  db.exec(`
    CREATE TABLE auth_nonces (
      address    TEXT NOT NULL,
      nonce      TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (address, nonce)
    )
  `)
  return db
}

// We need to inject the in-memory DB via the module's internals.
// Since db.ts uses a module-level singleton, we call migrate() with a test path.
import { migrate } from '../db'
import { config } from '../env'

// Override DATABASE_PATH to :memory: equivalent
let originalPath: string
beforeEach(() => {
  // Use the actual migrate() with an in-memory path override via env
  Object.assign(config, { databasePath: ':memory:' })
  migrate()
})

describe('issueNonce', () => {
  it('returns a nonce and expiresAt in the future', () => {
    const before = Date.now()
    const { nonce, expiresAt } = issueNonce('addr_test1')
    expect(typeof nonce).toBe('string')
    expect(nonce.length).toBeGreaterThan(0)
    expect(expiresAt).toBeGreaterThan(before + 4 * 60 * 1000)
  })
})

describe('consumeNonce', () => {
  it('happy path: issue then consume succeeds', () => {
    const address = 'addr_test2'
    const { nonce } = issueNonce(address)
    expect(consumeNonce(address, nonce)).toBe(true)
  })

  it('rejects a nonce consumed a second time', () => {
    const address = 'addr_test3'
    const { nonce } = issueNonce(address)
    consumeNonce(address, nonce)
    expect(consumeNonce(address, nonce)).toBe(false)
  })

  it('rejects a nonce for the wrong address', () => {
    const { nonce } = issueNonce('addr_alice')
    expect(consumeNonce('addr_bob', nonce)).toBe(false)
  })

  it('rejects an unknown nonce', () => {
    expect(consumeNonce('addr_test4', 'made-up-nonce')).toBe(false)
  })
})
