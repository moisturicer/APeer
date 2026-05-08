import { BlockfrostProvider, MeshWallet, Transaction } from '@meshsdk/core'
import { readFileSync } from 'node:fs'

// Load server/.env — script is run from project root so Bun won't find it automatically
for (const line of readFileSync('server/.env', 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  if (!(key in process.env)) process.env[key] = val
}

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:3000/api'
const PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID
const PDF_PATH = process.argv[2]

if (!PDF_PATH) {
  console.error('Usage: bun run scripts/test-submit.ts <path-to-pdf>')
  process.exit(1)
}

if (!PROJECT_ID) {
  console.error('Missing BLOCKFROST_PROJECT_ID in server/.env')
  process.exit(1)
}

// Same mnemonic as test-tx.ts — preprod test wallet only
const MNEMONIC = [
  'kitten', 'scale', 'evoke', 'develop', 'farm', 'rough',
  'quote', 'hover', 'illegal', 'maze', 'arch', 'analyst',
  'else', 'pupil', 'run', 'gorilla', 'bounce', 'input',
  'siege', 'ghost', 'animal', 'word', 'again', 'general',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str), b => b.toString(16).padStart(2, '0')).join('')
}

async function getNonce(address: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/nonce?address=${encodeURIComponent(address)}`)
  const json = await res.json() as { success: boolean; data: { nonce: string }; error?: string }
  if (!json.success) throw new Error(`getNonce: ${json.error}`)
  return json.data.nonce
}

async function sign(wallet: MeshWallet, address: string, nonce: string) {
  const { signature, key } = await wallet.signData(toHex(nonce), address)
  return { signature, key, nonce, walletAddress: address }
}

function step(n: number, label: string) {
  console.log(`\n[${n}/5] ${label}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── APeer full submission test ───────────────────────────────')
  console.log('File:   ', PDF_PATH)
  console.log('Server: ', BASE)

  const provider = new BlockfrostProvider(PROJECT_ID!)
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: 'mnemonic', words: MNEMONIC },
  })

  const address = await wallet.getChangeAddress()
  console.log('Address:', address)

  // ── 1: Get nonce + sign ───────────────────────────────────────────────────
  step(1, 'Fetching nonce and signing…')
  const nonce1 = await getNonce(address)
  const auth1 = await sign(wallet, address, nonce1)
  console.log('      ✓')

  // ── 2: POST /papers (upload + IPFS pin) ───────────────────────────────────
  step(2, 'Uploading PDF to IPFS via /api/papers…')

  const pdfBytes = readFileSync(PDF_PATH)
  const filename = PDF_PATH.split('/').pop() ?? 'paper.pdf'

  const fd = new FormData()
  fd.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), filename)
  fd.append('title', `Test: ${filename}`)
  fd.append('abstract', 'Automated test submission via scripts/test-submit.ts.')
  fd.append('authors', JSON.stringify([address]))
  fd.append('tags', JSON.stringify(['Testing', 'Cardano']))
  fd.append('reviewMode', 'Open')
  fd.append('walletAddress', auth1.walletAddress)
  fd.append('nonce', auth1.nonce)
  fd.append('signature', auth1.signature)
  fd.append('key', auth1.key)

  const submitRes = await fetch(`${BASE}/papers`, { method: 'POST', body: fd })
  const submit = await submitRes.json() as {
    success: boolean
    data?: { cid: string; pinned: boolean; sha256: string; metadataForTx: { label: '721'; metadata: Record<string, unknown> } }
    error?: string
  }

  if (!submit.success || !submit.data) {
    console.error('      ✗', submit.error)
    process.exit(1)
  }

  const { cid, sha256, metadataForTx } = submit.data
  console.log('      ✓ Pinned')
  console.log('      CID:    ', cid)
  console.log('      SHA-256:', sha256)

  // ── 3: Build + submit anchor tx on preprod ────────────────────────────────
  step(3, 'Building CIP-25 anchor transaction on preprod…')
  console.log('      (This is a real on-chain transaction — check your preprod wallet balance)')

  const tx = new Transaction({ initiator: wallet })
  tx.sendLovelace(address, '2000000')                          // 2 ADA self-transfer
  tx.setMetadata(721, metadataForTx.metadata['721'])           // CIP-25 paper metadata

  const unsignedTx = await tx.build()
  const signedTx = await wallet.signTx(unsignedTx)
  const txHash = await wallet.submitTx(signedTx)

  console.log('      ✓ Submitted')
  console.log('      txHash:  ', txHash)
  console.log('      Explorer:', `https://preprod.cardanoscan.io/transaction/${txHash}`)

  // ── 4: Wait briefly for the tx to propagate before confirming ────────────
  step(4, 'Waiting 15 s for tx to propagate to Blockfrost…')
  await new Promise(r => setTimeout(r, 15_000))
  console.log('      ✓')

  // ── 5: POST /papers/:cid/confirm ─────────────────────────────────────────
  step(5, 'Sending confirm to /api/papers/:cid/confirm…')

  const nonce2 = await getNonce(address)
  const auth2 = await sign(wallet, address, nonce2)

  const confirmRes = await fetch(`${BASE}/papers/${cid}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txHash,
      walletAddress: auth2.walletAddress,
      nonce: auth2.nonce,
      signature: auth2.signature,
      key: auth2.key,
    }),
  })

  const confirm = await confirmRes.json() as {
    success: boolean
    data?: { confirmationStatus: string }
    error?: string
  }

  if (!confirm.success) {
    console.error('      ✗', confirm.error)
    process.exit(1)
  }

  console.log('      ✓ Status:', confirm.data?.confirmationStatus)
  console.log('      Server will now poll Blockfrost every 10 s until depth ≥ 3 (~1–2 min on preprod)')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Done ─────────────────────────────────────────────────────')
  console.log('CID:     ', cid)
  console.log('txHash:  ', txHash)
  console.log('Pinata:  ', `https://app.pinata.cloud/ipfs/${cid}`)
  console.log('Explorer:', `https://preprod.cardanoscan.io/transaction/${txHash}`)
  console.log('API:     ', `curl ${BASE}/papers/${cid}`)
  console.log('')
  console.log('The paper will appear in GET /api/papers once the server confirms')
  console.log('≥ 3 blocks (usually within 1–2 min). Poll with:')
  console.log(`  watch -n 15 "curl -s ${BASE}/papers/${cid} | bunx prettyjson"`)
  console.log('')
}

main().catch(err => {
  console.error('\n✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
