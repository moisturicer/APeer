interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>()

  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  setWithTtl(key: K, value: V, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  async getOrCompute(key: K, ttlMs: number, compute: () => Promise<V>): Promise<V> {
    const cached = this.get(key)
    if (cached !== undefined) return cached
    const value = await compute()
    this.setWithTtl(key, value, ttlMs)
    return value
  }

  delete(key: K): void {
    this.store.delete(key)
  }
}
