function required(key: string): string {
  const val = process.env[key]
  if (!val) {
    const msg = `[env] Missing required env var: ${key}`
    if (process.env.NODE_ENV === 'production') throw new Error(msg)
    console.warn(msg)
    return ''
  }
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  blockfrostProjectId: required('BLOCKFROST_PROJECT_ID'),
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? 'development',

  pinataJwt: required('PINATA_JWT'),
  ipfsProvider: optional('IPFS_PROVIDER', 'pinata'),
  ipfsGatewayUrl: optional('IPFS_GATEWAY_URL', 'https://ipfs.io/ipfs'),
  maxPaperSizeMb: Number(process.env.MAX_PAPER_SIZE_MB) || 50,

  databasePath: optional('DATABASE_PATH', './data/apeer.db'),

  // PLACEHOLDER — 56 hex chars (28 bytes), same length as a real Cardano policy ID.
  // Replace with the deployed peerA policy ID before mainnet.
  peeraPolicyId: optional(
    'PEERA_POLICY_ID',
    '00000000000000000000000000000000000000000000000000000000'
  ),

  allowedOrigin: process.env.ALLOWED_ORIGIN,
}
