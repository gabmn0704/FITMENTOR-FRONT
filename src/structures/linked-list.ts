export interface SinglyNode<T> {
  value: T;
  next: SinglyNode<T> | null;
}

/**
 * Lista simplemente enlazada. Recorrido hacia delante: el carrusel de la
 * rutina del día avanza nodo a nodo y vuelve al inicio al terminar.
 */
export class SinglyLinkedList<T> implements Iterable<T> {
  private headNode: SinglyNode<T> | null = null;
  private tailNode: SinglyNode<T> | null = null;
  private count = 0;

  append(value: T): this {
    const node: SinglyNode<T> = { value, next: null };
    if (this.tailNode) this.tailNode.next = node;
    else this.headNode = node;
    this.tailNode = node;
    this.count++;
    return this;
  }

  prepend(value: T): this {
    this.headNode = { value, next: this.headNode };
    if (!this.tailNode) this.tailNode = this.headNode;
    this.count++;
    return this;
  }

  /** Primer nodo, o null si la lista está vacía. */
  first(): SinglyNode<T> | null {
    return this.headNode;
  }

  /** Nodo siguiente con vuelta al inicio (útil para carruseles). */
  nextCircular(node: SinglyNode<T>): SinglyNode<T> | null {
    return node.next ?? this.headNode;
  }

  find(predicate: (value: T) => boolean): T | undefined {
    for (let node = this.headNode; node; node = node.next) {
      if (predicate(node.value)) return node.value;
    }
    return undefined;
  }

  /** Elimina la primera coincidencia. Devuelve true si eliminó algo. */
  remove(predicate: (value: T) => boolean): boolean {
    let prev: SinglyNode<T> | null = null;
    let node: SinglyNode<T> | null = this.headNode;
    while (node) {
      if (predicate(node.value)) {
        if (prev) prev.next = node.next;
        else this.headNode = node.next;
        if (node === this.tailNode) this.tailNode = prev;
        this.count--;
        return true;
      }
      prev = node;
      node = node.next;
    }
    return false;
  }

  get size(): number {
    return this.count;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (const value of this) out.push(value);
    return out;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.headNode; node; node = node.next) yield node.value;
  }
}

export interface DoublyNode<T> {
  value: T;
  prev: DoublyNode<T> | null;
  next: DoublyNode<T> | null;
}

/**
 * Lista doblemente enlazada. Su cursor permite navegar anterior/siguiente
 * por el historial de sesiones sin copiar el arreglo.
 */
export class DoublyLinkedList<T> implements Iterable<T> {
  private headNode: DoublyNode<T> | null = null;
  private tailNode: DoublyNode<T> | null = null;
  private count = 0;

  append(value: T): this {
    const node: DoublyNode<T> = { value, prev: this.tailNode, next: null };
    if (this.tailNode) this.tailNode.next = node;
    else this.headNode = node;
    this.tailNode = node;
    this.count++;
    return this;
  }

  prepend(value: T): this {
    const node: DoublyNode<T> = { value, prev: null, next: this.headNode };
    if (this.headNode) this.headNode.prev = node;
    else this.tailNode = node;
    this.headNode = node;
    this.count++;
    return this;
  }

  first(): DoublyNode<T> | null {
    return this.headNode;
  }

  last(): DoublyNode<T> | null {
    return this.tailNode;
  }

  /** Quita un nodo concreto en O(1). */
  removeNode(node: DoublyNode<T>): void {
    if (node.prev) node.prev.next = node.next;
    else this.headNode = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tailNode = node.prev;
    node.prev = null;
    node.next = null;
    this.count--;
  }

  get size(): number {
    return this.count;
  }

  cursor(): ListCursor<T> {
    return new ListCursor(this);
  }

  toArray(): T[] {
    const out: T[] = [];
    for (const value of this) out.push(value);
    return out;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.headNode; node; node = node.next) yield node.value;
  }
}

/** Cursor bidireccional sobre una DoublyLinkedList. */
export class ListCursor<T> {
  private node: DoublyNode<T> | null;

  constructor(private readonly list: DoublyLinkedList<T>) {
    this.node = list.first();
  }

  get value(): T | undefined {
    return this.node?.value;
  }

  hasNext(): boolean {
    return this.node?.next != null;
  }

  hasPrev(): boolean {
    return this.node?.prev != null;
  }

  next(): T | undefined {
    if (this.node?.next) this.node = this.node.next;
    return this.value;
  }

  prev(): T | undefined {
    if (this.node?.prev) this.node = this.node.prev;
    return this.value;
  }

  /** Posición base 0 del cursor, o -1 si la lista está vacía. */
  index(): number {
    let i = 0;
    for (let node = this.list.first(); node && node !== this.node; node = node.next) i++;
    return this.node ? i : -1;
  }

  reset(): void {
    this.node = this.list.first();
  }
}
