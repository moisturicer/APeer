import { getBlocksLatest, getTx } from './blockfrost'
import { setAnchorTx, setPaperConfirmationStatus, listPendingConfirmation } from './papers'

interface Job {
  txHash: string
  cid: string
  pollCount: number
  intervalHandle: ReturnType<typeof setInterval>
}

const jobs = new Map<string, Job>()

const POLL_INTERVAL_MS = 10_000
const MAX_POLLS = 120       // 20 min at 10 s intervals
const REQUIRED_DEPTH = 3

export function track(txHash: string, cid: string): void {
  if (jobs.has(txHash)) return

  const job: Job = {
    txHash,
    cid,
    pollCount: 0,
    intervalHandle: setInterval(async () => {
      job.pollCount++

      try {
        const [tx, latest] = await Promise.all([getTx(txHash), getBlocksLatest()])
        const txBlockHeight = tx?.block_height
        const latestHeight = latest?.height

        if (txBlockHeight != null && latestHeight != null) {
          const depth = latestHeight - txBlockHeight + 1
          if (depth >= REQUIRED_DEPTH) {
            clearInterval(job.intervalHandle)
            jobs.delete(txHash)
            setAnchorTx(cid, txHash, Date.now())
            console.log(`[txConfirmation] ${txHash.slice(0, 12)}… confirmed at depth ${depth}`)
            return
          }
        }
      } catch {
        // Transient Blockfrost error — keep polling
      }

      if (job.pollCount >= MAX_POLLS) {
        clearInterval(job.intervalHandle)
        jobs.delete(txHash)
        setPaperConfirmationStatus(cid, 'confirmation_timeout')
        console.warn(`[txConfirmation] ${txHash.slice(0, 12)}… timed out after ${MAX_POLLS} polls`)
      }
    }, POLL_INTERVAL_MS),
  }

  jobs.set(txHash, job)
}

export function rehydrate(): void {
  try {
    const pending = listPendingConfirmation()
    for (const { cid, tx_hash } of pending) {
      if (tx_hash) track(tx_hash, cid)
    }
    if (pending.length > 0) {
      console.log(`[txConfirmation] Rehydrated ${pending.length} pending job(s)`)
    }
  } catch (err) {
    // DB not yet ready — called before migrate()
    console.warn('[txConfirmation] rehydrate skipped:', err instanceof Error ? err.message : err)
  }
}
