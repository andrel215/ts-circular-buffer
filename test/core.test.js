import test from 'node:test';
import assert from 'node:assert/strict';

import { CircularBuffer, DEFAULT_CAPACITY } from '../src/index.js';

test('rejects invalid capacities', () => {
  assert.throws(() => new CircularBuffer(0), RangeError);
  assert.throws(() => new CircularBuffer(-1), RangeError);
  assert.throws(() => new CircularBuffer(2.5), RangeError);
  assert.throws(() => new CircularBuffer(NaN), RangeError);
});

test('default capacity is exposed and positive', () => {
  const buf = new CircularBuffer();
  assert.equal(buf.capacity, DEFAULT_CAPACITY);
  assert.ok(buf.capacity > 0);
});

test('starts empty', () => {
  const buf = new CircularBuffer(3);
  assert.equal(buf.size, 0);
  assert.equal(buf.isEmpty, true);
  assert.equal(buf.isFull, false);
  assert.deepEqual(buf.toArray(), []);
  assert.equal(buf.shift(), undefined);
  assert.equal(buf.peek(), undefined);
  assert.equal(buf.at(0), undefined);
});

test('push and read back in FIFO order', () => {
  const buf = new CircularBuffer(3);
  buf.push('a').push('b').push('c');
  assert.equal(buf.size, 3);
  assert.equal(buf.isFull, true);
  assert.equal(buf.isEmpty, false);
  assert.deepEqual(buf.toArray(), ['a', 'b', 'c']);
  assert.equal(buf.at(0), 'a');
  assert.equal(buf.at(1), 'b');
  assert.equal(buf.at(2), 'c');
  assert.equal(buf.peek(), 'c');
});

test('drops the oldest item when full', () => {
  const buf = new CircularBuffer(3);
  buf.push(1).push(2).push(3);
  buf.push(4);
  assert.deepEqual(buf.toArray(), [2, 3, 4]);
  assert.equal(buf.size, 3);
  assert.equal(buf.isFull, true);
  buf.push(5).push(6);
  assert.deepEqual(buf.toArray(), [4, 5, 6]);
});

test('shift returns items oldest first and shrinks', () => {
  const buf = new CircularBuffer(3);
  buf.push(1).push(2).push(3).push(4);
  assert.equal(buf.shift(), 2);
  assert.equal(buf.shift(), 3);
  assert.equal(buf.size, 1);
  assert.deepEqual(buf.toArray(), [4]);
  assert.equal(buf.shift(), 4);
  assert.equal(buf.shift(), undefined);
  assert.equal(buf.isEmpty, true);
});

test('shift then push keeps logical order across the wrap', () => {
  const buf = new CircularBuffer(3);
  buf.push(1).push(2).push(3);
  assert.equal(buf.shift(), 1);
  buf.push(4);
  assert.deepEqual(buf.toArray(), [2, 3, 4]);
  assert.equal(buf.at(0), 2);
  assert.equal(buf.at(1), 3);
  assert.equal(buf.at(2), 4);
  assert.equal(buf.peek(), 4);
});

test('at returns undefined for out-of-range or non-integer indices', () => {
  const buf = new CircularBuffer(2);
  buf.push('x');
  assert.equal(buf.at(0), 'x');
  assert.equal(buf.at(1), undefined);
  assert.equal(buf.at(-1), undefined);
  assert.equal(buf.at(1.5), undefined);
  assert.equal(buf.at(NaN), undefined);
});

test('clear empties the buffer but keeps capacity', () => {
  const buf = new CircularBuffer(2);
  buf.push('a').push('b');
  buf.clear();
  assert.equal(buf.size, 0);
  assert.equal(buf.capacity, 2);
  assert.deepEqual(buf.toArray(), []);
  buf.push('c');
  assert.deepEqual(buf.toArray(), ['c']);
});

test('iteration walks oldest to newest', () => {
  const buf = new CircularBuffer(3);
  buf.push(1).push(2).push(3).push(4);
  assert.deepEqual([...buf], [2, 3, 4]);
});

test('iteration is over a snapshot and tolerates mutation', () => {
  const buf = new CircularBuffer(3);
  buf.push(1).push(2).push(3);
  const seen = [];
  for (const item of buf) {
    seen.push(item);
    if (item === 1) buf.push(4);
  }
  assert.deepEqual(seen, [1, 2, 3]);
  assert.deepEqual(buf.toArray(), [2, 3, 4]);
});

test('capacity one behaves like a single-slot register', () => {
  const buf = new CircularBuffer(1);
  buf.push('a');
  assert.deepEqual(buf.toArray(), ['a']);
  buf.push('b');
  assert.deepEqual(buf.toArray(), ['b']);
  assert.equal(buf.peek(), 'b');
  assert.equal(buf.shift(), 'b');
  assert.equal(buf.isEmpty, true);
});

test('holds arbitrary values including undefined and objects', () => {
  const buf = new CircularBuffer(3);
  const obj = { id: 1 };
  buf.push(undefined).push(null).push(obj);
  assert.deepEqual(buf.toArray(), [undefined, null, obj]);
  assert.equal(buf.at(2), obj);
});
