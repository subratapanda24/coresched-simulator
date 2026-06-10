/**
 * @fileoverview Min-heap implementation for priority-based task scheduling.
 *
 * Tasks with lower priority numbers are considered higher priority (i.e., priority 1
 * is the highest). The heap maintains the min-heap invariant so that extractMin()
 * always returns the task with the highest scheduling priority.
 *
 * @module PriorityHeap
 */

/**
 * A min-heap data structure optimised for CPU scheduling priority queues.
 *
 * Internally the heap is stored as a flat array where for any node at index `i`:
 *   - Parent:      Math.floor((i - 1) / 2)
 *   - Left child:  2 * i + 1
 *   - Right child: 2 * i + 2
 *
 * @example
 *   const heap = new PriorityHeap();
 *   heap.insert({ id: 'T-001', priority: 3 });
 *   heap.insert({ id: 'T-002', priority: 1 });
 *   heap.peek();       // → { id: 'T-002', priority: 1 }
 *   heap.extractMin(); // → { id: 'T-002', priority: 1 }
 */
class PriorityHeap {
  /** Create an empty min-heap. */
  constructor() {
    /** @type {Array<Object>} Internal heap storage. */
    this._heap = [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Insert a task into the heap.
   *
   * @param {Object} task - A task object. Must contain at least a numeric `priority` property.
   * @throws {Error} If the task is falsy or lacks a `priority` property.
   * @returns {void}
   * @timecomplexity O(log n)
   */
  insert(task) {
    if (!task || typeof task.priority !== 'number') {
      throw new Error('PriorityHeap.insert: task must have a numeric "priority" property.');
    }
    this._heap.push(task);
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the task with the smallest priority number (highest scheduling priority).
   *
   * @returns {Object|null} The highest-priority task, or `null` if the heap is empty.
   * @timecomplexity O(log n)
   */
  extractMin() {
    if (this._heap.length === 0) return null;
    if (this._heap.length === 1) return this._heap.pop();

    const min = this._heap[0];
    this._heap[0] = this._heap.pop();
    this._sinkDown(0);
    return min;
  }

  /**
   * Return the highest-priority task without removing it.
   *
   * @returns {Object|null} The highest-priority task, or `null` if the heap is empty.
   * @timecomplexity O(1)
   */
  peek() {
    return this._heap.length > 0 ? this._heap[0] : null;
  }

  /**
   * Return a **new** array of all tasks sorted by ascending priority number.
   *
   * The internal heap is **not** modified.
   *
   * @returns {Array<Object>} Sorted shallow copies of tasks.
   * @timecomplexity O(n log n)
   */
  toSortedArray() {
    // Clone, sort, return – avoids destructive extraction.
    return [...this._heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Stable secondary sort by arrival time (earlier arrival wins ties).
      return (a.arrivalTime ?? 0) - (b.arrivalTime ?? 0);
    });
  }

  /**
   * Return the number of elements currently in the heap.
   *
   * @returns {number}
   */
  size() {
    return this._heap.length;
  }

  /**
   * Check whether the heap contains zero elements.
   *
   * @returns {boolean}
   */
  isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Remove a specific task by its `id`.
   *
   * Performs a linear scan to find the task, swaps it with the last element,
   * and then restores the heap invariant.
   *
   * @param {string} taskId - The `id` property of the task to remove.
   * @returns {Object|null} The removed task, or `null` if not found.
   * @timecomplexity O(n) scan + O(log n) re-heapify
   */
  remove(taskId) {
    const idx = this._heap.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const removed = this._heap[idx];

    // Replace with last element and shrink.
    const last = this._heap.pop();

    // If we just popped the element we wanted, we're done.
    if (idx === this._heap.length) return removed;

    this._heap[idx] = last;

    // Restore heap invariant – element may need to go up OR down.
    this._bubbleUp(idx);
    this._sinkDown(idx);

    return removed;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Move the element at `idx` upward until the heap property is restored.
   * @param {number} idx
   * @private
   */
  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this._heap[idx].priority >= this._heap[parentIdx].priority) break;
      [this._heap[idx], this._heap[parentIdx]] = [this._heap[parentIdx], this._heap[idx]];
      idx = parentIdx;
    }
  }

  /**
   * Move the element at `idx` downward until the heap property is restored.
   * @param {number} idx
   * @private
   */
  _sinkDown(idx) {
    const length = this._heap.length;

    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this._heap[left].priority < this._heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this._heap[right].priority < this._heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === idx) break;

      [this._heap[idx], this._heap[smallest]] = [this._heap[smallest], this._heap[idx]];
      idx = smallest;
    }
  }
}

export { PriorityHeap };
