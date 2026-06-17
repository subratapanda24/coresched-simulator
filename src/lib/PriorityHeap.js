// Priority heap
class PriorityHeap {
  // Init heap
  constructor() {
    this._heap = [];
  }

  // Insert task
  insert(task) {
    if (!task || typeof task.priority !== 'number') {
      throw new Error('PriorityHeap.insert: task must have a numeric "priority" property.');
    }
    this._heap.push(task);
    this._bubbleUp(this._heap.length - 1);
  }

  // Extract min
  extractMin() {
    if (this._heap.length === 0) return null;
    if (this._heap.length === 1) return this._heap.pop();

    const min = this._heap[0];
    this._heap[0] = this._heap.pop();
    this._sinkDown(0);
    return min;
  }

  // Peek min
  peek() {
    return this._heap.length > 0 ? this._heap[0] : null;
  }

  // Sort queue
  toSortedArray() {
    // Sort copy
    return [...this._heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.arrivalTime ?? 0) - (b.arrivalTime ?? 0);
    });
  }

  // Get size
  size() {
    return this._heap.length;
  }

  // Check empty
  isEmpty() {
    return this._heap.length === 0;
  }

  // Remove task
  remove(taskId) {
    const idx = this._heap.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const removed = this._heap[idx];

    // Replace last
    const last = this._heap.pop();

    if (idx === this._heap.length) return removed;

    this._heap[idx] = last;

    // Restore invariant
    this._bubbleUp(idx);
    this._sinkDown(idx);

    return removed;
  }

  // Bubble up
  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this._heap[idx].priority >= this._heap[parentIdx].priority) break;
      [this._heap[idx], this._heap[parentIdx]] = [this._heap[parentIdx], this._heap[idx]];
      idx = parentIdx;
    }
  }

  // Sink down
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
