import { config } from './env'

interface PinOptions {
  filename: string
  buffer: Uint8Array
  metadata?: Record<string, string>
}

interface PinResult {
  cid: string
  pinned: boolean
}

export async function pinFileToIPFS({ filename, buffer, metadata = {} }: PinOptions): Promise<PinResult> {
  const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 2000))
    }

    const form = new FormData()
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename)
    form.append('pinataMetadata', JSON.stringify({ name: filename, keyvalues: metadata }))
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const res = await fetch(PINATA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.pinataJwt}` },
      body: form,
    })

    if (res.ok) {
      const json = (await res.json()) as { IpfsHash: string }
      return { cid: json.IpfsHash, pinned: true }
    }

    // 4xx = permanent failure; do not retry
    if (res.status >= 400 && res.status < 500) {
      const text = await res.text()
      throw new Error(`Pinata 4xx error ${res.status}: ${text}`)
    }

    // 5xx = transient; retry up to 2 times
    const text = await res.text()
    lastError = new Error(`Pinata 5xx error ${res.status} (attempt ${attempt + 1}): ${text}`)
    console.warn('[pinata]', lastError.message)
  }

  throw lastError ?? new Error('Pinata upload failed after 3 attempts')
}
