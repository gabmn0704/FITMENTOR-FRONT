interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Caché LRU con TTL opcional. Aprovecha el orden de inserción de Map:
 * al leer o escribir, la clave pasa al final; al exceder la capacidad
 * se elimina la primera (la menos usada recientemente).
 */
export class LRUCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  constructor(
    private readonly capacity: number,
    private readonly ttlMs = Number.POSITIVE_INFINITY,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("La capacidad debe ser un entero mayor que 0");
    }
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value as K;
      this.entries.delete(oldest);
    }
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  /** Devuelve el valor en caché o lo calcula y guarda. */
  async getOrLoad(key: K, load: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await load();
    this.set(key, value);
    return value;
  }
}
