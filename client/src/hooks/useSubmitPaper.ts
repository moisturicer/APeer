import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { signNonce } from '@/lib/cip30'
import { mintAnchorTx } from '@/lib/mintAnchorTx'
import type { ReviewMode } from '@/types'

export type SubmitState =
  | 'idle'
  | 'pinning'
  | 'awaitingMetadataSign'
  | 'uploading'
  | 'awaitingTxSign'
  | 'broadcasting'
  | 'confirming'
  | 'done'
  | 'error'

export interface SubmitForm {
  file: File
  title: string
  abstract: string
  authors: string[]
  tags: string[]
  reviewMode: ReviewMode
}

export function useSubmitPaper(walletName: string | null) {
  const [state, setState] = useState<SubmitState>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cid, setCid] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const reset = useCallback(() => {
    setState('idle')
    setProgress('')
    setError(null)
    setCid(null)
    setTxHash(null)
  }, [])

  const submit = useCallback(
    async (form: SubmitForm, address: string) => {
      if (!walletName || !address) {
        setError('Wallet not connected')
        setState('error')
        return
      }

      setError(null)
      setCid(null)
      setTxHash(null)

      try {
        // 1 — Get nonce from server
        setState('pinning')
        setProgress('Requesting authentication nonce…')
        const nonceRes = await api.getNonce(address)
        if (nonceRes.error || !nonceRes.data) {
          throw new Error(nonceRes.error ?? 'Failed to get nonce')
        }
        const { nonce } = nonceRes.data

        // 2 — Sign nonce with wallet
        setState('awaitingMetadataSign')
        setProgress('Please approve the signature request in your wallet…')
        const { signature, key } = await signNonce(walletName, address, nonce)

        // 3 — Upload file + metadata to backend (IPFS pinning)
        setState('uploading')
        setProgress('Uploading paper to IPFS…')

        const formData = new FormData()
        formData.append('file', form.file)
        formData.append('title', form.title)
        formData.append('abstract', form.abstract)
        formData.append('authors', JSON.stringify(form.authors))
        formData.append('tags', JSON.stringify(form.tags))
        formData.append('reviewMode', form.reviewMode)
        formData.append('walletAddress', address)
        formData.append('nonce', nonce)
        formData.append('signature', signature)
        formData.append('key', key)

        const submitRes = await api.submitPaper(formData)
        if (submitRes.error || !submitRes.data) {
          throw new Error(submitRes.error ?? 'IPFS upload failed')
        }
        const { cid: newCid, metadataForTx } = submitRes.data
        setCid(newCid)

        // 4 — Build and sign the CIP-25 anchoring transaction
        setState('awaitingTxSign')
        setProgress('Please sign the anchoring transaction in your wallet…')
        const newTxHash = await mintAnchorTx(walletName, address, metadataForTx)
        setTxHash(newTxHash)

        // 5 — Get a fresh nonce for confirmPaper (the first was consumed by submitPaper)
        setState('broadcasting')
        setProgress('Broadcasting confirmation…')
        const confirmNonceRes = await api.getNonce(address)
        if (confirmNonceRes.error || !confirmNonceRes.data) {
          throw new Error(confirmNonceRes.error ?? 'Failed to get confirm nonce')
        }
        const confirmNonce = confirmNonceRes.data.nonce
        const confirmSig = await signNonce(walletName, address, confirmNonce)

        const confirmRes = await api.confirmPaper(newCid, {
          txHash: newTxHash,
          walletAddress: address,
          nonce: confirmNonce,
          signature: confirmSig.signature,
          key: confirmSig.key,
        })
        if (confirmRes.error || !confirmRes.data) {
          throw new Error(confirmRes.error ?? 'Failed to register anchoring transaction')
        }

        setState('confirming')
        setProgress('Paper anchored! Waiting for on-chain confirmation (≥ 3 blocks)…')

        // Server handles tx tracking; poll the paper status so UI reflects actual confirmation progress.
        let confirmed = false
        for (let attempt = 0; attempt < 36; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          const paperRes = await api.getPaper(newCid)
          if (paperRes.error || !paperRes.data) {
            continue
          }

          const status = paperRes.data.confirmationStatus
          if (status === 'confirmed') {
            confirmed = true
            break
          }
          if (status === 'confirmation_timeout') {
            throw new Error('Transaction confirmation timed out. Please check your tx hash and retry.')
          }
        }

        if (!confirmed) {
          throw new Error('Still waiting for on-chain confirmation. Please check Discover in a few minutes.')
        }

        setState('done')
        setProgress('Paper successfully anchored on Cardano.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Submission failed'
        setError(msg)
        setState('error')
        setProgress('')
      }
    },
    [walletName]
  )

  return { state, progress, error, cid, txHash, submit, reset }
}
