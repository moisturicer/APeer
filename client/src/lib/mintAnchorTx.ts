import { BrowserWallet, Transaction } from '@meshsdk/core'
import { sanitizeMetadata } from '@/lib/metadataUtils'
import type { MetadataForTx } from '@/types'

/**
 * Builds and submits a Cardano transaction that anchors the paper's IPFS CID
 * on-chain via CIP-25 metadata (label 721).
 *
 * In Increment 2 this is a metadata-only self-transfer using a placeholder
 * policy ID. Once the real peerA policy is deployed in Increment 3, this
 * function will be updated to perform the actual 1-of-1 NFT mint.
 */
export async function mintAnchorTx(
  walletName: string,
  address: string,
  metadataForTx: MetadataForTx
): Promise<string> {
  const wallet = await BrowserWallet.enable(walletName)

  // Cardano enforces a 64-byte limit on every metadata string.
  // sanitizeMetadata recursively splits any string exceeding that limit
  // into a string[] so Mesh serialises it safely.
  const safeMetadata = sanitizeMetadata(metadataForTx.metadata['721']) as MetadataForTx['metadata']['721']

  const tx = new Transaction({ initiator: wallet })
  // Minimal self-transfer to make this a valid Cardano transaction
  tx.sendLovelace(address, '2000000')
  // Attach CIP-25 metadata at label 721 — the inner object (policy → asset → fields)
  tx.setMetadata(721, safeMetadata)

  const unsignedTx = await tx.build()
  const signedTx = await wallet.signTx(unsignedTx)
  return wallet.submitTx(signedTx)
}