# BNO 5+1 Tracker (Unofficial 3rd-Party App) 🇬🇧✈️

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d.svg?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff.svg?logo=vite)](https://vite.dev/)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3.7-1867c0.svg?logo=vuetify)](https://vuetifyjs.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0-yellow.svg)](https://pinia.vuejs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?logo=pwa)](https://github.com/vite-pwa/vite-plugin-pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An unofficial, 3rd-party web application designed for **British National (Overseas) (BNO) visa holders** to track, calculate, and manage travel absences, qualifications, supporting documents, and address history from the United Kingdom on the "5+1" route toward **Indefinite Leave to Remain (ILR / UK Settlement)** and **British Citizenship (Naturalisation)**.

*Note: This is an independent 3rd-party utility and is NOT affiliated with, endorsed by, or connected to the UK Home Office or the UK Government.*

---

## 🌟 Key Features

- **✈️ UK Home Office Rules-Aligned Absence Calculation**
  - Automatically excludes departure (start) and return (end) dates from full-day absence counts, matching UK Home Office guidance (days where part of the 24 hours is spent in the UK do not count as full days absent).
- **📅 Visa & Arrival Date Synchronization**
  - Track your **BNO Visa Start Date**, **UK Arrival Date**, and optional **ILR Approved Date**.
  - Automatically generates and syncs initial pre-arrival absence records if your UK arrival date differs from your visa start date.
- **🛡️ Continuous Rolling 12-Month Limit Monitoring (ILR)**
  - Evaluates absences across all continuous rolling 365-day windows during your 5-year qualifying period to ensure alignment with the **180-day maximum limit** for ILR.
- **🇬🇧 British Citizenship (Naturalisation) Absence Limits Checker**
  - Checks **5-Year Naturalisation Limit** (maximum **450 days** absent in the 5 years prior to application).
  - Checks **Final 12-Month Limit** (maximum **90 days** absent in the final year post-ILR).
  - Enforces physical presence requirement: Automatically checks if the applicant was present in the UK 5 years prior to application, advancing the window start date if it falls on an absent day.
- **📋 Document & Qualification Tracker (`DocumentView`)**
  - **Life in the UK Test**: Track status (Not Started / Scheduled / Passed), test date, Unique Reference Number (URN), test center location, and notes.
  - **English Language Requirement (B1)**: Track pathway (B1 SELT Test, UK Degree, Ecctis/ENIC Statement, Exemption), provider, test date, and certificate reference.
  - **5-Year Continuous Residence Evidence Checklist**: Year-by-year checklist (Years 1 to 5) covering Council Tax, P60/Tax, Bank Statements, Housing proof, Utility Bills, and custom evidence items.
  - **UK Address History Log**: Log residential addresses lived at during your 5-year qualifying period (Move-in/out dates, postcode, tenure type) required for Home Office SET(O) and Naturalisation AN application forms.
- **🧭 Right Navigation Drawer & Consolidated Data Management**
  - Quick-switch side drawer toggled via top bar hamburger menu (`mdi-menu`).
  - Consolidated **Commented YAML Export & Import** backing up both absence history and document tracker data with descriptive node comments.
  - Global **Clear All Data** modal with safety confirmation.
- **⚡ High-Performance Segment Tree Engine (`AbsenceSegmentTree`)**
  - Utilizes a custom $O(\log N)$ **Segment Tree** data structure over a 10-year day-by-day array to deliver lightning-fast custom date range queries and real-time rolling calculations.
- **📊 Settlement & Naturalisation Timeline**
  - Calculates your exact **Target ILR Settlement Date**, **Earliest ILR Application Date** (28 days prior), and **Target Naturalisation Date**.
- **🎨 Modern Responsive Vuetify 3 UI**
  - Features Union Jack Dark/Light theme toggling, 3-dots vertical action menus for table rows, context-aware form controls, and status chips.
- **💾 Local Device Storage & Data Privacy**
  - All data input (travel dates, visa details, test certificates, continuous residence checklists, and address history) is stored strictly locally on your device in browser `localStorage`. No data is uploaded, collected, or transmitted to any external server.
- **⚡ PWA Offline Support**
  - Progressive Web App capability via `vite-plugin-pwa` allowing full offline usage on mobile and desktop devices.

---

## 📐 UK Home Office Rules Overview

| Stage | Rule | Requirement / Limit | Description |
| :--- | :--- | :--- | :--- |
| **General** | **Full Day Absence** | Departure & Return Excluded | Only full 24-hour days spent entirely outside the UK count as days absent. Departure and arrival dates are excluded. |
| **ILR** | **Rolling 12-Month Limit** | Max **180 days** | No more than 180 days absent in any continuous rolling 365-day period across the 5 years. |
| **ILR** | **Qualifying Period** | **5 Years** | 5 years continuous residence starting from BNO Visa Grant Date or UK Arrival Date. |
| **ILR** | **Earliest Application** | **28 Days Prior** | ILR application can be submitted up to 28 days before completing the 5-year qualifying period. |
| **Qualifications** | **Life in the UK & B1** | Mandatory Tests | Pass certificate / URN required for ILR (SET(O)) and Naturalisation (AN). |
| **Residence** | **Address History & Proof** | Full 5-Year History | Official evidence of address (Council tax, P60s, utilities) and complete address log required. |
| **Citizenship** | **5-Year Absence Limit** | Max **450 days** | Total absent days in the 5 years immediately preceding application date must not exceed 450 days. |
| **Citizenship** | **Final 12-Month Limit** | Max **90 days** | Total absent days in the 12 months immediately preceding application date must not exceed 90 days. |
| **Citizenship** | **Presence Requirement** | Physical presence in UK | Must have been physically present in the UK on the exact day 5 years prior to application. |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `^22.18.0` or `>=24.12.0`
- **npm**: `^10.0.0` or higher

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/bno-5plus1-tracker.git
   cd bno-5plus1-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🛠️ NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server with hot module reloading. |
| `npm run build` | Compiles and bundles production assets into `dist/`. |
| `npm run preview` | Serves the locally built `dist/` production bundle. |
| `npm run format` | Runs Prettier to format all source files in `src/`. |

---

## 🏗️ Project Architecture

```
bno-5plus1-tracker/
├── public/                # Static assets and PWA icons
├── src/
│   ├── assets/            # Global styles (main.css)
│   ├── components/        # UI components
│   │   └── ReloadPrompt.vue # PWA update prompt snackbar
│   ├── plugins/           # Vuetify 3 theme configuration (vuetify.js)
│   ├── router/            # Vue Router routes (index.js)
│   ├── stores/            # Pinia stores
│   │   ├── absents.js     # Absence store (useAbsentsStore) & Segment Tree
│   │   └── documents.js   # Document store (useDocumentsStore)
│   ├── views/             # Application views
│   │   ├── AbsenceView.vue# Absence tracker dashboard
│   │   └── DocumentView.vue       # Qualifications & Document tracker
│   ├── App.vue            # Root layout with right navigation drawer
│   └── main.js            # Vue app entrypoint
├── .antigravity.md        # AI Agent workspace context & guidelines
├── .gitlab-ci.yml         # GitLab CI/CD pipeline for GitLab Pages
├── index.html             # HTML entry template
├── package.json           # App manifest and dependencies
└── vite.config.js         # Vite build configuration with Vuetify & VitePWA
```

### Key Data Structures & Stores

- **[AbsenceSegmentTree](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L29)**: 1-indexed array-backed segment tree (`Int32Array`) using standard `leftNode = 2 * node` and `rightNode = 2 * node + 1` child indexing (0th index unused), supporting $O(\log N)$ point updates and range sum queries over a 10-year period (3,653 days).
- **[useAbsentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L215)**: Pinia store handling absence records, visa/arrival/ILR dates, auto-arrival record sync, and rolling calculation getters.
- **[useDocumentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/documents.js)**: Pinia store managing Life in the UK test details, English B1 qualification, 5-year continuous residence checklist, and UK address history log.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer & Privacy Notice

*This application is an **independent, 3rd-party utility** provided for informational and personal tracking purposes only. It is **NOT an official application**, nor is it affiliated with, endorsed by, or connected to the UK Home Office or the UK Government. It does not constitute official legal or immigration advice. All data input into this application (absence history, key dates, qualification details, address history) is stored strictly locally on your device in your browser's `localStorage`. No server or remote database is used, and no personal data is collected or transmitted to external services. Always verify your eligibility, rules, and dates against official UK Home Office guidelines before submitting an ILR or Naturalisation application.*
