export const DEFAULT_CAPACITY = 16;

/**
 * A fixed-capacity ring buffer that overwrites the oldest item once full.
 *
 * The backing array is allocated once at construction time and never grows,
 * so pushing is O(1) and allocation-free after construction. `toArray`
 * returns items in logical order (oldest first), which is the order callers
 * almost always want when draining a log-like buffer.
 */
export class CircularBuffer {
  /**
   * @param {number} [capacity] Maximum number of items retained. Must be a
   *   positive integer. We reject non-integers rather than silently flooring
   *   them because a fractional capacity is almost always a bug in the caller.
   */
  constructor(capacity = DEFAULT_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive integer');
    }
    this._capacity = capacity;
    this._items = new Array(capacity);
    this._start = 0;
    this._size = 0;
  }

  /** @returns {number} */
  get capacity() {
    return this._capacity;
  }

  /** @returns {number} */
  get size() {
    return this._size;
  }

  /** @returns {boolean} */
  get isEmpty() {
    return this._size === 0;
  }

  /** @returns {boolean} */
  get isFull() {
    return this._size === this._capacity;
  }

  /**
   * Append an item. If the buffer is full the oldest item is evicted.
   * @param {*} item
   * @returns {this}
   */
  push(item) {
    const index = (this._start + this._size) % this._capacity;
    this._items[index] = item;
    if (this._size === this._capacity) {
      // Buffer was full: the write landed on the oldest slot, so advance start.
      this._start = (this._start + 1) % this._capacity;
    } else {
      this._size += 1;
    }
    return this;
  }

  /**
   * Remove and return the oldest item, or `undefined` when empty.
   * @returns {*}
   */
  shift() {
    if (this._size === 0) return undefined;
    const item = this._items[this._start];
    this._items[this._start] = undefined;
    this._start = (this._start + 1) % this._capacity;
    this._size -= 1;
    return item;
  }

  /**
   * Return the item at logical position `index` (0 = oldest) without removing
   * it. Out-of-range indices return `undefined` rather than throwing so that
   * callers can probe safely.
   * @param {number} index
   * @returns {*}
   */
  at(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this._size) {
      return undefined;
    }
    return this._items[(this._start + index) % this._capacity];
  }

  /**
   * Return the most recently pushed item, or `undefined` when empty.
   * @returns {*}
   */
  peek() {
    if (this._size === 0) return undefined;
    return this._items[(this._start + this._size - 1) % this._capacity];
  }

  /**
   * Remove every item. Keeps the backing array so the buffer can be reused
   * without another allocation.
   * @returns {this}
   */
  clear() {
    this._items = new Array(this._capacity);
    this._start = 0;
    this._size = 0;
    return this;
  }

  /**
   * Snapshot of the contents in logical order, oldest first.
   * @returns {Array<*>}
   */
  toArray() {
    const out = new Array(this._size);
    for (let i = 0; i < this._size; i += 1) {
      out[i] = this._items[(this._start + i) % this._capacity];
    }
    return out;
  }

  /**
   * Iterate oldest to newest. Iteration is over a snapshot of the current
   * contents, so mutating the buffer during iteration does not corrupt the
   * walk.
   * @returns {IterableIterator<*>}
   */
  *[Symbol.iterator]() {
    for (const item of this.toArray()) {
      yield item;
    }
  }
}
