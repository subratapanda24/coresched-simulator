/**
 * @fileoverview HashSet-based O(1) lookup for active task security IDs.
 *
 * Every task in the CoreSched simulation carries a unique `securityId` (e.g. "SEC-A1B2").
 * The TaskIdChecker provides constant-time operations for registering, querying, and
 * removing active security IDs so that the UI's "ID Checker" panel can resolve lookups
 * instantly.
 *
 * Internally backed by a `Map<string, Object>` keyed on `securityId`.
 *
 * @module TaskIdChecker
 */

/**
 * Constant-time registry of active task security IDs.
 *
 * @example
 *   const checker = new TaskIdChecker();
 *   checker.add({ id: 'T-001', securityId: 'SEC-A1B2', name: 'FileSync' });
 *   checker.has('SEC-A1B2');      // → true
 *   checker.getTask('SEC-A1B2');  // → { id: 'T-001', … }
 *   checker.size;                 // → 1
 */
class TaskIdChecker {
  /** Create an empty checker. */
  constructor() {
    /**
     * Internal map: securityId → task object.
     * @type {Map<string, Object>}
     * @private
     */
    this._map = new Map();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Register a task in the active set.
   *
   * @param {Object} task - A task object with at least a `securityId` string property.
   * @throws {Error} If the task is missing a `securityId`.
   * @returns {void}
   * @timecomplexity O(1)
   */
  add(task) {
    if (!task || !task.securityId) {
      throw new Error('TaskIdChecker.add: task must have a "securityId" property.');
    }
    this._map.set(task.securityId, task);
  }

  /**
   * Remove a task from the active set by its security ID.
   *
   * @param {string} securityId - The security ID to remove.
   * @returns {boolean} `true` if the entry existed and was removed, `false` otherwise.
   * @timecomplexity O(1)
   */
  remove(securityId) {
    return this._map.delete(securityId);
  }

  /**
   * Check whether a security ID is currently active.
   *
   * @param {string} securityId - The security ID to look up.
   * @returns {boolean} `true` if active.
   * @timecomplexity O(1)
   */
  has(securityId) {
    return this._map.has(securityId);
  }

  /**
   * Retrieve the full task object for a given security ID.
   *
   * @param {string} securityId - The security ID to look up.
   * @returns {Object|undefined} The task object, or `undefined` if not found.
   * @timecomplexity O(1)
   */
  getTask(securityId) {
    return this._map.get(securityId);
  }

  /**
   * Return all active security IDs as an array.
   *
   * @returns {string[]} Array of active security IDs.
   * @timecomplexity O(n)
   */
  getAll() {
    return Array.from(this._map.keys());
  }

  /**
   * Remove all entries.
   *
   * @returns {void}
   */
  clear() {
    this._map.clear();
  }

  /**
   * The number of active security IDs.
   *
   * @type {number}
   * @readonly
   */
  get size() {
    return this._map.size;
  }
}

export { TaskIdChecker };
