# Agent Coding Rules & Style Guidelines

These rules apply to every task in **bno-5plus1-tracker** unless explicitly overridden.
**Bias**: Caution over speed on non-trivial work. Use judgment on trivial tasks.

---

## The 13 Foundational Agent Rules

### Rule 1 — Think Before Coding
- State assumptions explicitly. If uncertain, ask rather than guess.
- Present multiple interpretations when ambiguity exists.
- Push back when a simpler approach exists.
- Stop when confused. Name what's unclear.

### Rule 2 — Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code, scripts, or configurations.
- Test: would a senior engineer say this is overcomplicated? If yes, simplify.

### Rule 3 — Surgical Changes
- Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, playbooks, comments, or formatting.
- Don't refactor what isn't broken. Match existing style.

### Rule 4 — Goal-Driven Execution
- Define success criteria. Loop until verified.
- Don't follow steps blindly. Define success and iterate.
- Strong success criteria let you loop independently.

### Rule 5 — Leverage the Model's Strengths
- Use for: large-scale context analysis, multi-modal data extraction, architectural drafting, and cross-file summarization.
- Do NOT use for: deterministic transforms, executing pipelines, or tasks where simple scripts suffice.
- If a native tool or code can answer, let it.

### Rule 6 — Context is Vast, but Focus is Critical
- While context windows are large, do not unnecessarily bloat them with irrelevant logs or unrelated data dumps.
- If the project shifts to a completely new domain, summarize the current state and start fresh to maintain absolute precision.
- Surface any context drift. Do not silently lose track of the core objective.

### Rule 7 — Surface Conflicts, Don't Average Them
- If two patterns or configurations contradict, pick one (more recent / more tested).
- Explain why. Flag the other for cleanup.
- Don't blend conflicting architectures or patterns.

### Rule 8 — Read Before You Write
- Before adding code, read exports, immediate callers, shared utilities, and relevant deployment pipelines.
- "Looks orthogonal" is dangerous. If unsure why code or infrastructure is structured a certain way, ask.

### Rule 9 — Tests Verify Intent, Not Just Behavior
- Tests (and CI checks) must encode WHY behavior matters, not just WHAT it does.
- A test that can't fail when business logic or system state changes is wrong.

### Rule 10 — Checkpoint After Every Significant Step
- Summarize what was done, what's verified, what's left.
- Don't continue from a state you can't describe back.
- If you lose track of the state, stop and restate.

### Rule 11 — Match the Project's Conventions, Even if You Disagree
- Conformance > taste inside the repository.
- If you genuinely think a convention is harmful, surface it. Don't fork silently or introduce divergent setups.

### Rule 12 — Fail Loud
- "Completed" is wrong if anything was skipped silently.
- "Pipelines pass" is wrong if any checks were bypassed.
- Default to surfacing system errors and uncertainty, not hiding them.

### Rule 13 — Do Not Commit Unless Explicitly Told
- Do not create git commits or run `git commit` unless explicitly instructed to do so by the user.
- Leave all modified files uncommitted/unstaged for user review and approval.

---

## Developer Guidelines & Technical Invariants

1. **Date Format & Handling**: Always work with standard `YYYY-MM-DD` strings for input dates. Use UTC dates (`parseDateUTC`) when indexing into the Segment Tree array to prevent timezone shifts.
2. **Segment Tree Synchronization**: When altering absence state in `useAbsentsStore`, ensure the segment tree is updated via helper functions (`addRecordToSegmentTree` / `removeRecordFromSegmentTree` / `rebuildSegmentTree`) to keep range queries accurate.
3. **Component API Conventions**:
   - Primary Tracker views (`AbsenceView.vue`, `DocumentView.vue`) and their subcomponents in `src/components/absence/` and `src/components/document/` use the Vue 3 **Options API** to maintain existing architecture.
   - Global layout and utility dialogs (`App.vue`, `ProfileDrawerSection.vue`, `ProfileManagementDialog.vue`, `ReloadPrompt.vue`) use the Composition API with `<script setup>`.
4. **No Direct State Mutation outside Store**: Components should interact with data exclusively through store methods and computed properties in Pinia stores (`absents.js`, `documents.js`, `profiles.js`).
5. **UI & Action Menu Consistency**: Maintain Vuetify 3 component styling and use 3-dots vertical action menus (`v-menu` with `mdi-dots-vertical` activator and compact `v-list`) for table row actions across all views.
6. **Theme Support**: Ensure dark/light themes are respected using Vuetify's `useTheme()` hook and Union Jack palettes defined in `src/plugins/vuetify.js`.
7. **3rd-Party App Designation & Phrasing**: Maintain clear designation that this is an unofficial 3rd-party application. Avoid using "Home Office Compliant" or official certification wording; use "Rules-Aligned" or "Within Limit" terminology. Keep drawer navigation titles concise ("Absence", "Document") under the "Trackers" section.
8. **Documentation Maintenance**: Automatically review and update `README.md` and `.agents/` whenever architectural changes, feature additions/modifications, or dependency changes occur during a task.

