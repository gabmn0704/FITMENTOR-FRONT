/** Normaliza texto para búsqueda: minúsculas, sin tildes ni espacios sobrantes. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface TrieNode<V> {
  children: Map<string, TrieNode<V>>;
  values: V[];
}

/**
 * Árbol de prefijos para autocompletado. Cada palabra (normalizada) puede
 * apuntar a uno o más valores, por ejemplo el ejercicio al que pertenece.
 */
export class Trie<V> {
  private readonly root: TrieNode<V> = { children: new Map(), values: [] };

  insert(key: string, value: V): void {
    let node = this.root;
    for (const char of normalizeText(key)) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: new Map(), values: [] };
        node.children.set(char, child);
      }
      node = child;
    }
    if (!node.values.includes(value)) node.values.push(value);
  }

  /** Valores de todas las palabras que empiezan por `prefix`, hasta `limit`. */
  suggest(prefix: string, limit = 8): V[] {
    let node: TrieNode<V> | undefined = this.root;
    for (const char of normalizeText(prefix)) {
      node = node.children.get(char);
      if (!node) return [];
    }
    const out: V[] = [];
    const visit = (current: TrieNode<V>) => {
      for (const value of current.values) {
        if (out.length >= limit) return;
        if (!out.includes(value)) out.push(value);
      }
      for (const child of current.children.values()) {
        if (out.length >= limit) return;
        visit(child);
      }
    };
    visit(node);
    return out;
  }

  has(key: string): boolean {
    let node: TrieNode<V> | undefined = this.root;
    for (const char of normalizeText(key)) {
      node = node.children.get(char);
      if (!node) return false;
    }
    return node.values.length > 0;
  }
}
