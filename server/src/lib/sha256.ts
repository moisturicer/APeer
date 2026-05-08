export async function sha256Hex(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}
