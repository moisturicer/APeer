/**
 * Cardano metadata strings must be ≤ 64 **bytes** (not characters).
 * This helper splits any string that exceeds the limit into an array of
 * chunks, each guaranteed to be ≤ 64 bytes when UTF-8 encoded.
 *
 * The chain accepts `string | string[]` transparently, so consumers can
 * spread the result directly into their metadata objects.
 *
 * Usage:
 *   metaStr('hello')          → 'hello'
 *   metaStr('a'.repeat(100))  → ['aaaa…(64 bytes)', 'aaaa…(remaining)']
 */
export function metaStr(value: string): string | string[] {
  const encoder = new TextEncoder();

  // Fast path — the vast majority of short strings
  if (encoder.encode(value).length <= 64) {
    return value;
  }

  const chunks: string[] = [];
  let remaining = value;

  while (remaining.length > 0) {
    // Binary-search for the largest prefix that fits in 64 bytes
    let lo = 0;
    let hi = Math.min(remaining.length, 64); // chars are always ≤ bytes

    while (lo < hi) {
      const mid = Math.ceil((lo + hi + 1) / 2);
      if (encoder.encode(remaining.slice(0, mid)).length <= 64) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    chunks.push(remaining.slice(0, lo));
    remaining = remaining.slice(lo);
  }

  return chunks;
}

/**
 * Truncate a metadata **key** to ≤ 64 UTF-8 bytes.
 * Keys cannot be split into arrays — they must remain a single string —
 * so we truncate at a clean UTF-8 boundary instead.
 */
export function truncateKey(key: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(key).length <= 64) return key;

  // Walk back from byte 64 until we land on a non-continuation byte
  // (UTF-8 continuation bytes have the pattern 10xxxxxx = 0x80–0xBF)
  const bytes = encoder.encode(key);
  let len = 64;
  while (len > 0 && (bytes[len] & 0xc0) === 0x80) len--;
  return new TextDecoder().decode(bytes.slice(0, len));
}

/**
 * Recursively walk a metadata value tree and:
 * - Split string **values** that exceed 64 bytes into string[]
 * - Truncate string **keys** that exceed 64 bytes (arrays not allowed as keys)
 */
export function sanitizeMetadata(value: unknown): unknown {
  if (typeof value === 'string') {
    return metaStr(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        truncateKey(k),       // keys: truncate, never split
        sanitizeMetadata(v),  // values: split into array if needed
      ]),
    );
  }
  return value; // number, boolean, null — pass through unchanged
}

/**
 * Dev-only: log every string in the metadata tree with its byte length.
 * Call this right before tx.setMetadata() to find any remaining offenders.
 * Remove or tree-shake in production.
 */
export function debugMetadataStrings(value: unknown, path = 'root'): void {
  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value).length;
    if (bytes > 64) {
      console.error(`[metadata] OVER LIMIT at ${path}: ${bytes} bytes → "${value.slice(0, 40)}…"`);
    } else {
      console.log(`[metadata] ok (${bytes}B) at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => debugMetadataStrings(v, `${path}[${i}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      debugMetadataStrings(k, `${path}.key("${k.slice(0, 20)}")`);
      debugMetadataStrings(v, `${path}.${k.slice(0, 20)}`);
    }
  }
}