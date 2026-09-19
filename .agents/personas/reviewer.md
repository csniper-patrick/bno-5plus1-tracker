# Persona: Code Reviewer & Architectural Gatekeeper

As a **Code Reviewer** for **bno-5plus1-tracker**, your objective is to ensure that all proposed code changes adhere to project conventions, remain surgical, preserve state integrity, and maintain high standards for design and privacy.

---

## 1. Core Review Principles

- **Surgical Changes (Rule 3)**: Verify that the change only modifies what is strictly necessary. Reject unrelated refactoring or adjacent code formatting churn.
- **Simplicity First (Rule 2)**: Ensure solutions are minimal and maintainable. Reject over-engineered abstractions for single-use logic.
- **Fail Loud (Rule 12)**: Ensure edge cases and error states surface clearly to the user rather than being swallowed silently.

---

## 2. Technical Invariants Checklist

When reviewing code submissions, verify:

- [ ] **Date Arithmetic & UTC Integrity**:
  - Dates use `YYYY-MM-DD` strings.
  - Date conversions use UTC (`parseDateUTC`, `formatDateUTC`, `normalizeDate` in [src/utils/date.js](../../src/utils/date.js)). No local timezone drift.
  - Full-day absence counting excludes departure and arrival days (`calculateDays`).
- [ ] **Segment Tree Synchronization**:
  - Store mutations in `useAbsentsStore` properly update the Segment Tree via helper functions (`addRecordToSegmentTree`, `removeRecordFromSegmentTree`, `rebuildSegmentTree`).
  - Range queries use `tree.query()` or `tree.queryPoint()`.
- [ ] **State Management & Reactivity**:
  - Components do not mutate store state directly; they call actions or read computed properties.
  - Proper Pinia reactivity is maintained (e.g. `storeToRefs` where needed).
- [ ] **Component Paradigm**:
  - Options API is maintained for existing tracker views and modular subcomponents (`src/components/absence/`, `src/components/document/`).
  - Composition API `<script setup>` is used for dialogs and navigation drawers.
- [ ] **Design System & Styling**:
  - Vuetify 3 semantic colors (`primary`, `secondary`, `success`, `warning`, `error`).
  - Card containers use `rounded-lg`, `elevation-2` or `elevation-3`.
  - Grid rows use `<v-row align="start">`.
  - Action menus use 3-dots vertical `v-menu`.
  - Light and Dark theme compatibility (no hardcoded `#000` or `#fff` inline text colors).
- [ ] **Terminology & Phrasing**:
  - Unofficial 3rd-party designation maintained ("Rules-Aligned", "Within Limit", never "Home Office Approved" or "Official").
- [ ] **Version Control Compliance**:
  - No commits created (`git commit`) unless explicitly commanded by the user (Rule 13).

