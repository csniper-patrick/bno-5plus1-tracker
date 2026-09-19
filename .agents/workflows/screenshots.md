# User Guide Responsive Screen Capture Workflow

This document details the automated screenshot generation and responsive image rendering workflow for the User Guide & Operation Manual ([InstructionView.vue](../../src/views/InstructionView.vue)).

---

## 1. Automated Screen Capture Procedure

To maintain visual screenshot parity across desktop and mobile devices:

1. **Automated Capture Command**:
   ```bash
   npm run capture:screenshots
   # Or directly via Playwright:
   npx playwright test e2e/generate-instruction-screenshots.spec.js
   ```
   *Note: Playwright automatically starts the Vite dev server on `http://localhost:5173` if it is not already active.*

2. **Data Seeding & Viewport Captures ([generate-instruction-screenshots.spec.js](../../e2e/generate-instruction-screenshots.spec.js))**:
   - **Data Seeding (`seedData(page)`)**: Resets Pinia stores (`absents` and `documents`), sets realistic key visa dates (Visa Start: `2021-06-01`, UK Arrival: `2021-06-15`, Visa Expiry: `2026-06-01`), injects 7 realistic travel absence records (including multi-stop European and Asian itineraries), and populates test records (Life in UK pass URN, B1 SELT pass), NI number (`QQ 12 34 56 A`), and UK address history (`10 Downing Street`).
   - **Desktop Viewport (`1280x800`)**: Captures 7 high-resolution desktop PNG screenshots outputting to `public/instructions/step*.png`:
     - `step1_overview.png`: Main dashboard with Key Dates, Timeline cards, and active Absence Records.
     - `step2_key_dates.png`: "Set Key Visa Dates" modal dialog.
     - `step3_add_absence.png`: "Add Absence Record" form with multi-stop route input (`France ➔ Spain`).
     - `step3_absence_list.png`: Absence Records table showing multi-stop routes and badges.
     - `step4_documents.png`: Qualifications, NI number, residence evidence checklist, and Document Vault view.
     - `step5_reference.png`: Reference & Official Guidance cards view.
     - `step5_profiles.png`: Right navigation drawer with multi-profile switcher expanded.
     - `step5_copy_to_profile.png`: "Select Shared Profiles" companion sharing modal dialog.
   - **Mobile / Narrow Viewport (`390x844`)**: Automated Playwright test with `isMobile: true`, `hasTouch: true`, and compact dimensions captures matching narrow screenshots outputting to `public/instructions/narrow_step*.png`.

---

## 2. Responsive Image Component & Viewport Control ([InstructionView.vue](../../src/views/InstructionView.vue))

- **Auto Mode Detection**: Defaults to `viewMode = 'auto'`. Computes `effectiveMode` using Vuetify's `$vuetify.display.smAndDown` breakpoint (resolving to `'mobile'` on small screens or `'desktop'` on larger screens).
- **Dynamic Image Prefix (`imgPrefix`)**: Dynamically resolves `/instructions/narrow_` when `isMobileView` is active vs `/instructions/` on desktop.
- **Viewport Toggle Bar**: Provides a 2-button segmented toggle (`Desktop View` & `Mobile View`) displaying real-time auto-detection status chips (e.g., `Desktop View (Auto)` / `Mobile View (Auto)`).
- **Top-Aligned Step Content**: Uses `align="start"` on step grid rows (`v-row`) to align text columns and action buttons cleanly at the top of cards.
- **Merged Overview Banner Card**: Consolidates application description, core features, and dashboard screenshot into a single hero overview card.
- **Operation-Focused FAQ**: FAQ accordion items address app operations exclusively (Segment Tree calculation engine, arrival date sync, local IndexedDB storage, ZIP backup/restore, document vault linking). Visa policy and immigration guidance are delegated to `ReferenceView`.

---

## 3. Navigation & i18n Synchronization

Whenever updating screenshot steps or instruction text:

- Registered routes: `/instruction` and `/guide` in `src/router/index.js`.
- Navigation drawer menu entry: "User Guide" under "Trackers" in `src/App.vue` with `mdi-book-open-page-variant` icon.
- Dual-language dictionary keys: Synchronize under the `instruction` namespace in [src/locales/en.js](../../src/locales/en.js) and [src/locales/zh-HK.js](../../src/locales/zh-HK.js).

