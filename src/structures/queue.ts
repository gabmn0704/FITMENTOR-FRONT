interface QueueNode<T> {
  value: T;
  next: QueueNode<T> | null;
}

/** Cola FIFO enlazada con O(1) en enqueue y dequeue. */
export class Queue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private count = 0;

  enqueue(value: T): void {
    const node: QueueNode<T> = { value, next: null };
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.count++;
  }

  dequeue(): T | undefined {
    const node = this.head;
    if (!node) return undefined;
    this.head = node.next;
    if (!this.head) this.tail = null;
    this.count--;
    return node.value;
  }

  peek(): T | undefined {
    return this.head?.value;
  }

  get size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let node = this.head; node; node = node.next) out.push(node.value);
    return out;
  }
}
