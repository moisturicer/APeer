import { config } from './env'
import type { Cip25Metadata, ReviewMode } from '../types'

interface BuildParams {
  cid: string
  title: string
  abstract: string
  authors: string[]
  tags: string[]
  reviewMode: ReviewMode
}

// Cardano metadata strings must be <= 64 bytes. Longer values must be split
// into an array of <=64-byte chunks — this is the standard on-chain encoding.
function metaStr(s: string): string | string[] {
  if (s.length <= 64) return s
  const chunks: string[] = []
  for (let i = 0; i < s.length; i += 64) chunks.push(s.slice(i, i + 64))
  return chunks
}

function assetNameFromCid(cid: string): string {
  // Cardano asset names must be <= 32 bytes (UTF-8)
  const enc = new TextEncoder().encode(cid)
  if (enc.length <= 32) return cid
  return Array.from(enc.slice(0, 32), b => b.toString(16).padStart(2, '0')).join('')
}

export function buildPaperMetadata({ cid, title, abstract, authors, tags, reviewMode }: BuildParams): Cip25Metadata {
  const policyId = config.peeraPolicyId
  const assetName = assetNameFromCid(cid)

  return {
    '721': {
      [policyId]: {
        [assetName]: {
          name: metaStr(title),
          description: metaStr(abstract.slice(0, 128)),
          authors: authors.map(metaStr),
          tags: tags.map(metaStr),
          review_mode: reviewMode,
          ipfs_cid: metaStr(cid),
          version: '1.0',
        },
      },
    },
  }
}
