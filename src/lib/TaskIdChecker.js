// Task registry
class TaskIdChecker {
  // Init map
  constructor() {
    this._map = new Map();
  }

  // Add task
  add(task) {
    if (!task || !task.securityId) {
      throw new Error('TaskIdChecker.add: task must have a "securityId" property.');
    }
    this._map.set(task.securityId, task);
  }

  // Remove task
  remove(securityId) {
    return this._map.delete(securityId);
  }

  // Check existence
  has(securityId) {
    return this._map.has(securityId);
  }

  // Get task
  getTask(securityId) {
    return this._map.get(securityId);
  }

  // Get all
  getAll() {
    return Array.from(this._map.keys());
  }

  // Clear all
  clear() {
    this._map.clear();
  }

  // Get size
  get size() {
    return this._map.size;
  }
}

export { TaskIdChecker };
