# ts-circular-buffer

A fixed-capacity ring buffer for JavaScript: pushing into a full buffer silently drops the oldest item.

```js
import { CircularBuffer } from './src/index.js';

const log = new CircularBuffer(3);
log.push('a').push('b').push('c');
log.push('d');            // 'a' is evicted

console.log(log.toArray()); // ['b', 'c', 'd']
console.log(log.shift());   // 'b'
console.log(log.size);      // 2
```

## Why this exists

A plain array grows without bound, and a queue built on `Array.prototype.shift` is O(n) per removal. When you only ever care about the most recent N events, the array is the wrong shape and the shift is wasted work. This buffer trades the ability to grow for O(1) push and shift: the storage is allocated once, and once full each push overwrites the oldest slot in place.

The trade-off is that capacity is fixed at construction. If you need unbounded growth, use an array. If you need a bounded window of recent items, this is the structure.

## API

- `new CircularBuffer(capacity = 16)` — `capacity` must be a positive integer; anything else throws `RangeError`.
- `capacity` — the fixed maximum size.
- `size` — the number of items currently stored.
- `isEmpty` / `isFull` — booleans.
- `push(item)` — append, evicting the oldest item if full. Returns the buffer for chaining.
- `shift()` — remove and return the oldest item, or `undefined` when empty.
- `peek()` — return the newest item without removing it, or `undefined` when empty.
- `at(index)` — return the item at logical position `index` (0 = oldest), or `undefined` if out of range.
- `clear()` — drop all items, keeping the capacity.
- `toArray()` — a snapshot in logical order, oldest first.
- `[Symbol.iterator]` — iterates oldest to newest over a snapshot, so mutating the buffer during a `for...of` loop is safe.

## The awkward edge

`shift()` and `peek()` return `undefined` when the buffer is empty, and `undefined` is also a legal value to store. That means `buf.shift() === undefined` does not tell you whether the buffer was empty — check `buf.isEmpty` first if you care. `at()` has the same ambiguity for out-of-range indices. This is a deliberate choice to keep the hot path branch-free; the alternative would be a sentinel object or a `{ value, found }` wrapper, both of which cost an allocation per call.
