# Documentation Maintenance Workflow

This document outlines the automatic documentation maintenance routine to ensure absolute parity across `README.md`, `AGENTS.md`, and the modular `.agents/` directory.

---

## 1. Trigger Criteria

Execute this maintenance routine whenever completing tasks that introduce:

- System architecture or data layer modifications.
- Pinia store changes or IndexedDB schema upgrades.
- Dependency changes (e.g., adding, updating, or removing npm packages).
- New feature workflows or UI/UX design updates.
- File structure modifications, file additions, or directory relocations.
- Vue Router additions or route path modifications.

---

## 2. Impact Scope Assessment

Before finalizing documentation changes:

1. Identify affected components, store modules, utilities, services, dependencies, and test suites.
2. Determine whether the change affects user-facing documentation (`README.md`, `InstructionView.vue`) or developer/agent guidelines (`.agents/`).

---

## 3. Synchronizing `README.md`

- **Tech Stack & Badges**: Update dependency versions, framework badges, and key feature summaries.
- **Rules Summary Table**: Keep Home Office rule summaries (ILR 180-day rolling rule, Naturalisation 450/90-day limits, physical presence rule) aligned with statutory guidelines.
- **Scripts & Commands**: Update the NPM Scripts table if any npm scripts or command flags change.
- **Architecture Tree**: Keep the project directory structure diagram up-to-date.
- **Module Deep Dives**: Document new or refactored services, stores, and utilities with relative markdown file links (for example, `src/utils/date.js`).

---

## 4. Synchronizing `.agents/` & `AGENTS.md`

- **Context Router (`AGENTS.md`)**:
  - Keep the routing table and triggers updated if new modules or runbooks are introduced.
- **System Overview (`.agents/overview.md`)**:
  - Update Key Regulations, Tech Stack, and Module Deep-Dives to reflect codebase changes.
- **Rules & Workflows**:
  - Update `rules/` and `workflows/` if testing commands, deployment steps, or coding conventions change.
- **Official References (`.agents/references.md`)**:
  - Synchronize official links and verified NGO channels if new guidance publications are referenced.

---

## 5. Formatting & Parity Verification

Always execute:

```bash
# Verify formatting across all markdown and code files
npm run format

# Run unit tests to verify tests remain consistent with docs
npm run test:unit
```

Ensure all file links use relative markdown syntax.

