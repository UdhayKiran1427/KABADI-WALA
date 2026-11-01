/** Small, dependency-free collection helpers shared by API routes and services. */

/** Groups `items` by `key`, mapping each item with `value`. Insertion order is kept per key. */
export function groupValues<T, K, V>(items: readonly T[], key: (item: T) => K, value: (item: T) => V): Map<K, V[]> {
  const out = new Map<K, V[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(value(item));
    else out.set(k, [value(item)]);
  }
  return out;
}
