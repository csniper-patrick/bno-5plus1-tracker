/**
 * Segment Tree data structure for efficient O(log N) range sum queries over a 10-year period (day-by-day).
 * Supports O(1) point queries via pre-calculated leafMap, O(D log N) range updates, and O(log N) range sum queries.
 */
export class AbsenceSegmentTree {
  /**
   * Constructs an AbsenceSegmentTree with a fixed maximum leaf capacity.
   * Allocates Int32Arrays of size 4 * size + 1 to store segment sums (1-indexed, 0th index unused)
   * and Int32Array of size size for leaf coverage counts. Initialized to zero by default.
   *
   * @param {number} size - Number of leaves (days in the 10-year tracking window).
   */
  constructor(size) {
    this.n = size
    this.tree = new Int32Array(4 * size + 1)
    this.leafCover = new Int32Array(size)
    this.leafMap = new Int32Array(size)
    if (size > 0) {
      this._initLeafMap(1, 0, size - 1)
    }
  }

  /**
   * Helper to pre-calculate leafMap node indices.
   * @private
   */
  _initLeafMap(node, start, end) {
    if (start === end) {
      this.leafMap[start] = node
      return
    }
    const mid = Math.floor((start + end) / 2)
    this._initLeafMap(2 * node, start, mid)
    this._initLeafMap(2 * node + 1, mid + 1, end)
  }

  /**
   * Initializes and constructs the Segment Tree from an array of index intervals/ranges.
   * Resets existing tree values to zero, then updates each interval range-by-range.
   *
   * @param {Array<{startIdx: number, endIdx: number}|{start: number, end: number}|[number, number]>|Uint8Array|number[]} intervals - Array of range intervals (or daily binary array).
   * @param {number} [val=1] - Coverage delta value to apply to intervals (defaults to 1).
   */
  build(intervals, val = 1) {
    if (this.n === 0) return
    this.tree.fill(0)
    this.leafCover.fill(0)
    this._initLeafMap(1, 0, this.n - 1)

    if (!intervals || intervals.length === 0) return

    // Fallback: If a 1D daily array is passed (Uint8Array or array of numbers)
    if (intervals instanceof Uint8Array || (Array.isArray(intervals) && typeof intervals[0] === 'number')) {
      let runStart = -1
      for (let i = 0; i < intervals.length; i++) {
        if (intervals[i] !== 0) {
          if (runStart === -1) runStart = i
        } else {
          if (runStart !== -1) {
            this.updateRange(runStart, i - 1, val)
            runStart = -1
          }
        }
      }
      if (runStart !== -1) {
        this.updateRange(runStart, intervals.length - 1, val)
      }
      return
    }

    // Process array of intervals [{startIdx, endIdx}] or [[start, end]]
    for (const item of intervals) {
      if (!item) continue
      let startIdx, endIdx
      if (Array.isArray(item)) {
        startIdx = item[0]
        endIdx = item[1]
      } else if (typeof item === 'object') {
        startIdx = item.startIdx !== undefined ? item.startIdx : item.start
        endIdx = item.endIdx !== undefined ? item.endIdx : item.end
      }
      if (startIdx !== undefined && endIdx !== undefined && startIdx <= endIdx) {
        this.updateRange(startIdx, endIdx, val)
      }
    }
  }

  /**
   * Computes the 1D tree node index for a specific leaf index in O(1) time.
   * Direct lookup using pre-calculated leafMap.
   *
   * @private
   * @param {number} targetIdx - Target leaf index (0 to n - 1).
   * @returns {number} 1D tree array index for the target leaf, or -1 if out of bounds.
   */
  _getLeafNode(targetIdx) {
    if (targetIdx < 0 || targetIdx >= this.n) return -1
    return this.leafMap[targetIdx]
  }

  /**
   * Queries a single point (leaf index) utilizing _getLeafNode in O(1) time.
   *
   * @param {number} idx - Leaf index to query (0 to n - 1).
   * @returns {number} Value of the leaf node (0 or 1), or 0 if index is invalid/out of bounds.
   */
  queryPoint(idx) {
    const node = this._getLeafNode(idx)
    if (node === -1) return 0
    return this.tree[node]
  }

  /**
   * Updates a range of nodes [qstart, qend] in O(D log N) time, where D is range length.
   *
   * @param {number} qstart - Start leaf index.
   * @param {number} qend - End leaf index.
   * @param {number} [val=1] - Value delta (+1 for adding coverage, -1 for removing coverage).
   */
  updateRange(qstart, qend, val = 1) {
    if (this.n === 0 || qstart > qend || val === 0) return
    const clampedStart = Math.max(0, qstart)
    const clampedEnd = Math.min(this.n - 1, qend)
    if (clampedStart > clampedEnd) return
    this._updateRange(1, 0, this.n - 1, clampedStart, clampedEnd, val)
  }

  /**
   * Recursive helper function for range updates.
   *
   * @private
   * @param {number} node - Index of current tree node.
   * @param {number} start - Segment start leaf index.
   * @param {number} end - Segment end leaf index.
   * @param {number} l - Update range start index.
   * @param {number} r - Update range end index.
   * @param {number} val - Coverage delta (+1 or -1).
   */
  _updateRange(node, start, end, l, r, val) {
    if (start === end) {
      this.leafCover[start] = Math.max(0, this.leafCover[start] + val)
      this.tree[node] = this.leafCover[start] > 0 ? 1 : 0
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    if (l <= mid) {
      this._updateRange(leftNode, start, mid, l, r, val)
    }
    if (r > mid) {
      this._updateRange(rightNode, mid + 1, end, l, r, val)
    }
    this.tree[node] = this.tree[leftNode] + this.tree[rightNode]
  }

  /**
   * Queries range sum in [qstart, qend] in O(log N) time.
   *
   * @param {number} qstart - Start leaf index.
   * @param {number} qend - End leaf index.
   * @returns {number} Range sum of absent days.
   */
  query(qstart, qend) {
    if (this.n === 0 || qstart > qend) return 0
    const clampedStart = Math.max(0, qstart)
    const clampedEnd = Math.min(this.n - 1, qend)
    if (clampedStart > clampedEnd) return 0
    return this._query(1, 0, this.n - 1, clampedStart, clampedEnd)
  }

  /**
   * Recursive helper function for range sum queries.
   *
   * @private
   * @param {number} node - Index of current tree node.
   * @param {number} start - Node segment start index.
   * @param {number} end - Node segment end index.
   * @param {number} l - Query range start index.
   * @param {number} r - Query range end index.
   * @returns {number} Sum of absent days in intersection [start, end] ∩ [l, r].
   */
  _query(node, start, end, l, r) {
    if (r < start || end < l) return 0
    if (l <= start && end <= r) return this.tree[node]
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    return this._query(leftNode, start, mid, l, r) + this._query(rightNode, mid + 1, end, l, r)
  }
}

