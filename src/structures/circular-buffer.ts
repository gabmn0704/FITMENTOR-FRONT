/**
 * Buffer circular de capacidad fija. Al llenarse, cada nuevo valor
 * sobrescribe al más antiguo. Sirve como ventana móvil para suavizar
 * ángulos y precisión en vivo.
 */
export class CircularBuffer<T> {
  private readonly items: (T | undefined)[];
  private writeIndex = 0;
  private count = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("La capacidad debe ser un entero mayor que 0");
    }
    this.items = new Array<T | undefined>(capacity);
  }

  push(value: T): void {
    this.items[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  get size(): number {
    return this.count;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  clear(): void {
    this.items.fill(undefined);
    this.writeIndex = 0;
    this.count = 0;
  }

  /** Valor más reciente, o undefined si está vacío. */
  latest(): T | undefined {
    if (!this.count) return undefined;
    const index = (this.writeIndex - 1 + this.capacity) % this.capacity;
    return this.items[index];
  }

  /** Valores de más antiguo a más reciente. */
  toArray(): T[] {
    const out: T[] = [];
    const start = this.isFull() ? this.writeIndex : 0;
    for (let i = 0; i < this.count; i++) {
      out.push(this.items[(start + i) % this.capacity] as T);
    }
    return out;
  }

  /** Media aritmética de los valores; null si no hay datos. */
  mean(this: CircularBuffer<number>): number | null {
    if (!this.size) return null;
    const values = this.toArray();
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
