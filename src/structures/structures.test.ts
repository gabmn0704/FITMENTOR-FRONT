import { describe, expect, it } from "vitest";
import {
  CircularBuffer,
  DoublyLinkedList,
  LRUCache,
  MinHeap,
  Queue,
  SinglyLinkedList,
  Stack,
  Trie,
} from "./index";

describe("Stack", () => {
  it("devuelve los elementos en orden LIFO", () => {
    const stack = new Stack<number>();
    stack.push(1);
    stack.push(2);
    expect(stack.peek()).toBe(2);
    expect(stack.pop()).toBe(2);
    expect(stack.pop()).toBe(1);
    expect(stack.pop()).toBeUndefined();
    expect(stack.isEmpty()).toBe(true);
  });

  it("lista del más reciente al más antiguo sin mutar", () => {
    const stack = new Stack<string>();
    ["a", "b", "c"].forEach((v) => stack.push(v));
    expect(stack.toArray()).toEqual(["c", "b", "a"]);
    expect(stack.size).toBe(3);
  });
});

describe("Queue", () => {
  it("mantiene orden FIFO y estado vacío correcto", () => {
    const queue = new Queue<string>();
    queue.enqueue("uno");
    queue.enqueue("dos");
    expect(queue.size).toBe(2);
    expect(queue.dequeue()).toBe("uno");
    expect(queue.peek()).toBe("dos");
    expect(queue.dequeue()).toBe("dos");
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue("tres");
    expect(queue.toArray()).toEqual(["tres"]);
  });
});

describe("SinglyLinkedList", () => {
  it("añade al inicio y al final, y busca y elimina", () => {
    const list = new SinglyLinkedList<number>().append(2).append(3).prepend(1);
    expect(list.toArray()).toEqual([1, 2, 3]);
    expect(list.find((v) => v > 1)).toBe(2);
    expect(list.remove((v) => v === 2)).toBe(true);
    expect(list.toArray()).toEqual([1, 3]);
    expect(list.size).toBe(2);
    expect(list.remove((v) => v === 99)).toBe(false);
  });

  it("nextCircular vuelve al inicio al llegar al final (carrusel)", () => {
    const list = new SinglyLinkedList<string>().append("a").append("b");
    const first = list.first()!;
    const second = list.nextCircular(first)!;
    expect(second.value).toBe("b");
    expect(list.nextCircular(second)!.value).toBe("a");
  });

  it("eliminar el último actualiza la cola", () => {
    const list = new SinglyLinkedList<number>().append(1).append(2);
    list.remove((v) => v === 2);
    list.append(3);
    expect([...list]).toEqual([1, 3]);
  });
});

describe("DoublyLinkedList", () => {
  it("navega anterior y siguiente con el cursor", () => {
    const list = new DoublyLinkedList<string>().append("s1").append("s2").append("s3");
    const cursor = list.cursor();
    expect(cursor.value).toBe("s1");
    expect(cursor.hasPrev()).toBe(false);
    expect(cursor.next()).toBe("s2");
    expect(cursor.next()).toBe("s3");
    expect(cursor.hasNext()).toBe(false);
    expect(cursor.next()).toBe("s3");
    expect(cursor.prev()).toBe("s2");
    expect(cursor.index()).toBe(1);
    cursor.reset();
    expect(cursor.index()).toBe(0);
  });

  it("removeNode mantiene los enlaces en ambos sentidos", () => {
    const list = new DoublyLinkedList<number>().append(1).append(2).append(3);
    const middle = list.first()!.next!;
    list.removeNode(middle);
    expect(list.toArray()).toEqual([1, 3]);
    expect(list.last()!.prev!.value).toBe(1);
    expect(list.size).toBe(2);
  });

  it("prepend actualiza la cabeza y el enlace previo", () => {
    const list = new DoublyLinkedList<number>().append(2).prepend(1);
    expect(list.toArray()).toEqual([1, 2]);
    expect(list.first()!.next!.prev!.value).toBe(1);
  });
});

describe("CircularBuffer", () => {
  it("sobrescribe el valor más antiguo al llenarse", () => {
    const buffer = new CircularBuffer<number>(3);
    [1, 2, 3, 4].forEach((v) => buffer.push(v));
    expect(buffer.toArray()).toEqual([2, 3, 4]);
    expect(buffer.latest()).toBe(4);
    expect(buffer.isFull()).toBe(true);
  });

  it("calcula la media de la ventana", () => {
    const buffer = new CircularBuffer<number>(2);
    expect(buffer.mean()).toBeNull();
    buffer.push(10);
    buffer.push(20);
    buffer.push(40);
    expect(buffer.mean()).toBe(30);
  });

  it("rechaza capacidades inválidas", () => {
    expect(() => new CircularBuffer<number>(0)).toThrow(RangeError);
  });
});

describe("Trie", () => {
  it("autocompleta ignorando tildes y mayúsculas", () => {
    const trie = new Trie<string>();
    trie.insert("Sentadilla", "squat");
    trie.insert("Sentadilla búlgara", "bulgarian");
    trie.insert("Flexión", "push_up");
    expect(trie.suggest("sent")).toEqual(["squat", "bulgarian"]);
    expect(trie.suggest("FLEX")).toEqual(["push_up"]);
    expect(trie.suggest("zzz")).toEqual([]);
    expect(trie.has("flexion")).toBe(true);
  });

  it("respeta el límite de sugerencias", () => {
    const trie = new Trie<number>();
    for (let i = 0; i < 10; i++) trie.insert(`ej${i}`, i);
    expect(trie.suggest("ej", 3)).toHaveLength(3);
  });
});

describe("MinHeap", () => {
  it("devuelve los valores de menor a mayor", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    [5, 1, 4, 2, 3].forEach((v) => heap.push(v));
    const out: number[] = [];
    while (!heap.isEmpty()) out.push(heap.pop()!);
    expect(out).toEqual([1, 2, 3, 4, 5]);
  });

  it("ordena por prioridad personalizada", () => {
    const heap = new MinHeap<{ name: string; score: number }>((a, b) => a.score - b.score);
    heap.push({ name: "plancha", score: 80 });
    heap.push({ name: "peso muerto", score: 30 });
    expect(heap.peek()?.name).toBe("peso muerto");
    expect(heap.size).toBe(2);
  });
});

describe("LRUCache", () => {
  it("expulsa la clave menos usada recientemente", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.has("b")).toBe(false);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("caduca las entradas según el TTL", () => {
    let time = 0;
    const cache = new LRUCache<string, string>(5, 100, () => time);
    cache.set("k", "v");
    time = 99;
    expect(cache.get("k")).toBe("v");
    time = 100;
    expect(cache.get("k")).toBeUndefined();
  });

  it("getOrLoad evita llamadas repetidas al cargador", async () => {
    const cache = new LRUCache<string, number>(4);
    let calls = 0;
    const load = async () => {
      calls++;
      return 42;
    };
    expect(await cache.getOrLoad("x", load)).toBe(42);
    expect(await cache.getOrLoad("x", load)).toBe(42);
    expect(calls).toBe(1);
  });
});
