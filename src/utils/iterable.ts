/**
 * Find the first item that satisfies the predicate.
 * @param iterator Iterator to walk through.
 * @param predicate Predicate to check.
 * @returns The first item or undefined.
 */
export function firstOrDefault<T>(iterator: IterableIterator<T>, predicate: (T) => boolean): T | undefined {
    for (const item of iterator) {
        if (predicate(item)) return item;
    }

    return undefined;
}

/**
 * Find the first item that satisfies the predicate, if not found throws error.
 * @param iterator Iterator to walk through.
 * @param predicate Predicate to check.
 * @returns The first item.
 */
export function first<T>(iterator: IterableIterator<T>, predicate: (t: T) => boolean): T {
    for (const item of iterator) {
        if (predicate(item)) return item;
    }

    throw new Error('No item satisfies the predicate.');
}