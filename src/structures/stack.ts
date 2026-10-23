/** Pila LIFO. Se usa para deshacer repeticiones durante una sesión. */
export class Stack<T> {
  private items: T[] = [];

  push(value: T): void {
    this.items.push(value);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  /** Del más reciente al más antiguo. */
  toArray(): T[] {
    return [...this.items].reverse();
  }
}
