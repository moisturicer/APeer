import { getDb } from './db'

export function issueNonce(address: string): { nonce: string; expiresAt: number } {
  const db = getDb()
  const nonce = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + 5 * 60 * 1000

  // Purge expired nonces for this address before inserting
  db.run('DELETE FROM auth_nonces WHERE address = ? AND expires_at < ?', [address, now])

  db.run(
    'INSERT INTO auth_nonces (address, nonce, expires_at, used) VALUES (?, ?, ?, 0)',
    [address, nonce, expiresAt]
  )

  return { nonce, expiresAt }
}

export function consumeNonce(address: string, nonce: string): boolean {
  const db = getDb()

  const consume = db.transaction(() => {
    const row = db
      .query<{ used: number; expires_at: number }, [string, string]>(
        'SELECT used, expires_at FROM auth_nonces WHERE address = ? AND nonce = ?'
      )
      .get(address, nonce)

    if (!row || row.used || row.expires_at < Date.now()) return false

    db.run('UPDATE auth_nonces SET used = 1 WHERE address = ? AND nonce = ?', [address, nonce])
    return true
  })

  return consume()
}

export function isNonceAvailable(address: string, nonce: string): boolean {
  const db = getDb()
  const row = db
    .query<{ used: number; expires_at: number }, [string, string]>(
      'SELECT used, expires_at FROM auth_nonces WHERE address = ? AND nonce = ?'
    )
    .get(address, nonce)

  return !!row && row.used === 0 && row.expires_at >= Date.now()
}
