/**
 * Canonical power-of-2 iterative Segment Tree for efficient O(log K) range sum queries.
 * Sized at K = 2^13 = 8,192 leaves (~22.4 years) to comfortably cover the 20-year tracking span.
 * Supports direct O(1) mathematical leaf addressing (cap + idx), iterative O(D + log K) range updates,
 * O(K) single-pass batch builds, and non-recursive O(log K) branchless range sum queries.
 */

export const DEFAULT_SEGMENT_TREE_CAPACITY = 8192

export class AbsenceSegmentTree {
  /**
   * Constructs an AbsenceSegmentTree rounded to the next power of 2.
   * Operates on standard 0-indexed day offsets [0, cap - 1]. Allocates an Int32Array of size 2 * cap
   * for tree nodes (leaves located at contiguous indices [cap, 2 * cap - 1]) and leaf coverage tracking array of size cap.
   *
   * @param {number} [size=DEFAULT_SEGMENT_TREE_CAPACITY] - Desired capacity (automatically rounded to next power of 2).
   */
  constructor(size = DEFAULT_SEGMENT_TREE_CAPACITY) {
    if (size <= 0) {
      this.n = 0
      this.cap = 0
      this.tree = new Int32Array(0)
      this.leafCover = new Int32Array(0)
      return
    }

    let cap = 2
    while (cap < size) cap <<= 1
    this.n = cap
    this.cap = cap
    this.tree = new Int32Array(2 * cap)
    this.leafCover = new Int32Array(cap)
  }

  /**
   * Initializes and constructs the Segment Tree from an array of index intervals/ranges.
   * Performs an O(D_total + K) single-pass linear bottom-up build without repeated tree descents.
   *
   * @param {Array<{startIdx: number, endIdx: number}|{start: number, end: number}|[number, number]>|Uint8Array|number[]} intervals - Array of range intervals (or daily binary array).
   * @param {number} [val=1] - Coverage delta value to apply to intervals (defaults to 1).
   */
  build(intervals, val = 1) {
    if (this.cap === 0) return
    this.tree.fill(0)
    this.leafCover.fill(0)

    if (!intervals || intervals.length === 0) return

    // Fallback: If a 1D daily array is passed (Uint8Array or array of numbers)
    if (
      intervals instanceof Uint8Array ||
      (Array.isArray(intervals) && typeof intervals[0] === 'number')
    ) {
      for (let i = 0; i < Math.min(this.cap, intervals.length); i++) {
        if (intervals[i] !== 0) {
          this.leafCover[i] += val
        }
      }
    } else {
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
          const l = Math.max(0, startIdx)
          const r = Math.min(this.cap - 1, endIdx)
          for (let i = l; i <= r; i++) {
            this.leafCover[i] = Math.max(0, this.leafCover[i] + val)
          }
        }
      }
    }

    // Set leaves in tree
    for (let i = 0; i < this.cap; i++) {
      this.tree[this.cap + i] = this.leafCover[i] > 0 ? 1 : 0
    }

    // Single-pass bottom-up pull in O(cap)
    for (let i = this.cap - 1; i > 0; i--) {
      this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1]
    }
  }

  /**
   * Computes the 1D tree node index for a specific leaf index in O(1) time.
   * Direct arithmetic calculation without auxiliary lookup tables.
   *
   * @param {number} targetIdx - Target leaf index (0 to cap - 1).
   * @returns {number} 1D tree array index for the target leaf, or -1 if out of bounds.
   */
  _getLeafNode(targetIdx) {
    if (targetIdx < 0 || targetIdx >= this.cap) return -1
    return this.cap + targetIdx
  }

  /**
   * Queries a single point (leaf index) utilizing direct arithmetic in O(1) time.
   *
   * @param {number} idx - Leaf index to query (0 to cap - 1).
   * @returns {number} Value of the leaf node (0 or 1), or 0 if index is invalid/out of bounds.
   */
  queryPoint(idx) {
    if (idx < 0 || idx >= this.cap) return 0
    return this.tree[this.cap + idx]
  }

  /**
   * Updates a range of leaves [qstart, qend] and pulls updates upward in O(D + log K) time.
   *
   * @param {number} qstart - Start leaf index.
   * @param {number} qend - End leaf index.
   * @param {number} [val=1] - Value delta (+1 for adding coverage, -1 for removing coverage).
   */
  updateRange(qstart, qend, val = 1) {
    if (this.cap === 0 || qstart > qend || val === 0) return
    const l = Math.max(0, qstart)
    const r = Math.min(this.cap - 1, qend)
    if (l > r) return

    // Update leaves
    for (let i = l; i <= r; i++) {
      this.leafCover[i] = Math.max(0, this.leafCover[i] + val)
      this.tree[this.cap + i] = this.leafCover[i] > 0 ? 1 : 0
    }

    // Iteratively pull up parent sums
    let left = (this.cap + l) >> 1
    let right = (this.cap + r) >> 1
    while (left > 0) {
      for (let i = left; i <= right; i++) {
        this.tree[i] = this.tree[2 * i] + this.tree[2 * i + 1]
      }
      left >>= 1
      right >>= 1
    }
  }

  /**
   * Queries range sum in [qstart, qend] in O(log K) time using branchless iterative traversal.
   *
   * @param {number} qstart - Start leaf index.
   * @param {number} qend - End leaf index.
   * @returns {number} Range sum of absent days.
   */
  query(qstart, qend) {
    if (this.cap === 0 || qstart > qend) return 0
    let l = Math.max(0, qstart)
    let r = Math.min(this.cap - 1, qend)
    if (l > r) return 0

    let sum = 0
    for (l += this.cap, r += this.cap + 1; l < r; l >>= 1, r >>= 1) {
      if (l & 1) sum += this.tree[l++]
      if (r & 1) sum += this.tree[--r]
    }
    return sum
  }
}
