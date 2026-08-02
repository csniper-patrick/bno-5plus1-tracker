/**
 * Segment Tree data structure for efficient O(log N) range sum queries over a 10-year period (day-by-day).
 * Supports O(log N) point updates for incremental tree modifications when records are added/updated/removed.
 */
export class AbsenceSegmentTree {
  /**
   * Constructs an AbsenceSegmentTree with a fixed maximum leaf capacity.
   * Allocates an Int32Array of size 4 * size + 1 to store segment sum tree nodes (1-indexed, 0th index unused).
   *
   * @param {number} size - Number of leaves (days in the 10-year tracking window).
   */
  constructor(size) {
    this.n = size
    this.tree = new Int32Array(4 * size + 1)
  }

  /**
   * Initializes and constructs the Segment Tree from a daily binary array (0 = present, 1 = absent).
   * Runs in O(N) time where N is the length of the input array.
   *
   * @param {Uint8Array|number[]} arr - Daily array where index i represents day offset from visa start date.
   */
  build(arr) {
    this.n = arr.length
    if (this.n === 0) return
    if (this.tree.length < 4 * this.n + 1) {
      this.tree = new Int32Array(4 * this.n + 1)
    }
    this._build(arr, 1, 0, this.n - 1)
  }

  /**
   * Recursive helper function to construct tree nodes.
   *
   * @private
   * @param {Uint8Array|number[]} arr - Source daily absence array.
   * @param {number} node - Index of current tree node in the 1D tree array.
   * @param {number} start - Segment start leaf index.
   * @param {number} end - Segment end leaf index.
   */
  _build(arr, node, start, end) {
    if (start === end) {
      this.tree[node] = arr[start]
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    this._build(arr, leftNode, start, mid)
    this._build(arr, rightNode, mid + 1, end)
    this.tree[node] = this.tree[leftNode] + this.tree[rightNode]
  }

  /**
   * Updates a single point (leaf index) in O(log N) time.
   *
   * @param {number} idx - Leaf index to update (0 to n - 1).
   * @param {number} val - New value (0 or 1).
   */
  updatePoint(idx, val) {
    if (idx < 0 || idx >= this.n) return
    this._updatePoint(1, 0, this.n - 1, idx, val)
  }

  /**
   * Recursive helper function for point updates.
   *
   * @private
   * @param {number} node - Index of current tree node.
   * @param {number} start - Segment start leaf index.
   * @param {number} end - Segment end leaf index.
   * @param {number} idx - Target leaf index.
   * @param {number} val - New leaf value.
   */
  _updatePoint(node, start, end, idx, val) {
    if (start === end) {
      this.tree[node] = val
      return
    }
    const mid = Math.floor((start + end) / 2)
    const leftNode = 2 * node
    const rightNode = 2 * node + 1
    if (idx <= mid) {
      this._updatePoint(leftNode, start, mid, idx, val)
    } else {
      this._updatePoint(rightNode, mid + 1, end, idx, val)
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
    const leftSum = this._query(leftNode, start, mid, l, r)
    const rightSum = this._query(rightNode, mid + 1, end, l, r)
    return leftSum + rightSum
  }
}
