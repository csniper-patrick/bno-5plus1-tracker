# Dependency Rules & Management

To maintain codebase health, security compliance, deterministic builds, and framework compatibility in **bno-5plus1-tracker**, follow these dependency standards:

---

## 1. Core Framework Stack & Versions

- **Vue**: Vue 3 (`vue`) with Pinia for state management (`pinia`)
- **UI & Icons**: Vuetify 3 (`vuetify`) and Material Design Icons (`@mdi/font`)
- **Build System**: Vite 8 (`vite`, `@vitejs/plugin-vue`, `vite-plugin-vuetify`, `@vitejs/plugin-vue-jsx`)
- **SSG & SEO**: `vite-ssg` with `@unhead/vue` and `unhead`
- **PWA**: `vite-plugin-pwa`
- **Serialization**: `yaml` for YAML exports/imports and `jszip` for backup packaging
- **Internationalization**: `vue-i18n` (v11)
- **Routing**: `vue-router` (v5)

---

## 2. Policy on Adding New Dependencies

- **Minimal Surface**: Do not introduce new external libraries or packages without a clear justification. Prefer native web APIs (e.g. `crypto.randomUUID()`, `Intl.DateTimeFormat`, `TypedArray`, `IndexedDB`) or existing project utilities.
- **Bundle Impact**: Evaluate bundle size before proposing any client-side library. Avoid heavy runtime dependencies when lightweight alternatives or native code suffice.
- **License Compliance**: Any introduced package must possess an OSI-approved permissive open-source license (MIT, Apache 2.0, BSD).

---

## 3. Lockfile Synchronization & Determinism

- **Always Sync**: `package.json` and `package-lock.json` must always be updated and committed together.
- **CI Dependency Installation**: The CI pipeline strictly uses `npm ci --cache .npm --prefer-offline` to ensure 100% deterministic builds across environments. Never bypass lockfile synchronization.

---

## 4. Upgrade & Validation SOP

When evaluating or updating packages:

1. **Check Outdated Packages**:
   ```bash
   npm outdated
   # Check latest versions across npm:
   npx npm-check-updates
   ```
2. **Apply Updates**:
   ```bash
   # Safe SemVer update:
   npm update
   # Major version updates (requires deliberate evaluation):
   npx npm-check-updates -u
   npm install
   ```
3. **Mandatory Post-Upgrade Verification**:
   - Run unit test suite: `npm run test:unit`
   - Run Playwright E2E browser tests: `npm run test:e2e`
   - Verify SSG production build: `npm run build`
   - Verify code formatting: `npm run format`
   - Run security audit: `npm audit`

