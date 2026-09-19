# Git Standards & Commit Policy

This document outlines version control conventions, commit policies, and pull request guidelines for **bno-5plus1-tracker**.

---

## 1. The Cardinal Rule: No Commits Without Explicit Permission

> **Rule 13 — Do Not Commit Unless Explicitly Told**  
> AI agents and automated assistants must **never** run `git commit` or create git commits unless explicitly instructed to do so by the user.

- **Leave Changes Uncommitted**: Always leave modified files unstaged/uncommitted so the user can inspect diffs and approve changes.
- **Surface Clean Status**: When completing a task, report modified files and provide clear instructions if the user wishes to commit.

---

## 2. Pre-Commit Verification Checklist

Before creating a commit (when explicitly requested by the user):

1. **Verify Unit Tests**:
   ```bash
   npm run test:unit
   ```
2. **Verify Code Formatting**:
   ```bash
   npm run format
   ```
3. **Inspect Working Tree**:
   ```bash
   git status
   git diff
   ```
4. **Ensure No Accidental Files**:
   - Ensure temporary files, test dumps, or scratch files are excluded.
   - Ensure `package.json` and `package-lock.json` are paired if dependencies changed.

---

## 3. Commit Message Conventions

When the user asks to commit, use **Conventional Commits** syntax:

```text
<type>(<scope>): <short imperative description>

[optional body describing rationale and context]
```

### Allowed Types

- `feat`: A new user-facing feature or enhancement.
- `fix`: A bug fix or calculation correction.
- `docs`: Documentation updates (`README.md`, `.agents/`, inline comments).
- `test`: Adding or refactoring unit/E2E test suites.
- `refactor`: Code refactoring that neither fixes a bug nor adds a feature.
- `chore`: Dependency updates, build configuration, or CI pipeline changes.

### Examples

```text
feat(absence): add companion profile avatar chips to expanded table
fix(segmentTree): correct leafCover decrements on overlapping trip removal
docs(agents): reorganize monolithic AGENTS.md into modular .agents structure
test(profiles): add test coverage for syncSharedAbsenceProfiles validation
```

---

## 4. Branching & PR Standards

- **Default Branch**: `main`.
- **Feature Branches**: `feat/<short-title>`, `fix/<short-title>`, `docs/<short-title>`.
- **Merge Requests**: Must pass GitLab CI `test` stage (unit tests and Playwright E2E suite).

