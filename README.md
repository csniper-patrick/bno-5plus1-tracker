# BNO 5+1 Tracker 🇬🇧✈️

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d.svg?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff.svg?logo=vite)](https://vite.dev/)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3.7-1867c0.svg?logo=vuetify)](https://vuetifyjs.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0-yellow.svg)](https://pinia.vuejs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?logo=pwa)](https://github.com/vite-pwa/vite-plugin-pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, high-performance web application designed for **British National (Overseas) (BNO) visa holders** to track, calculate, and manage absences from the United Kingdom on the "5+1" route toward **Indefinite Leave to Remain (ILR / UK Settlement)** and **British Citizenship (Naturalisation)**.

---

## 🌟 Key Features

- **✈️ UK Home Office Compliant Absence Calculation**
  - Automatically excludes departure (start) and return (end) dates from full-day absence counts, matching UK Home Office rules (days where part of the 24 hours is spent in the UK do not count as full days absent).
- **📅 Visa & Arrival Date Synchronization**
  - Track your **BNO Visa Start Date**, **UK Arrival Date**, and optional **ILR Approved Date**.
  - Automatically generates and syncs initial pre-arrival absence records if your UK arrival date differs from your visa start date.
- **🛡️ Continuous Rolling 12-Month Limit Monitoring (ILR)**
  - Evaluates absences across all continuous rolling 365-day windows during your 5-year qualifying period to ensure compliance with the **180-day maximum limit** for ILR.
- **🇬🇧 British Citizenship (Naturalisation) Compliance Checker**
  - Checks **5-Year Naturalisation Limit** (maximum **450 days** absent in the 5 years prior to application).
  - Checks **Final 12-Month Limit** (maximum **90 days** absent in the final year post-ILR).
  - Enforces physical presence requirement: Automatically checks if the applicant was present in the UK 5 years prior to application, advancing the window start date if it falls on an absent day.
- **⚡ High-Performance Segment Tree Engine (`AbsenceSegmentTree`)**
  - Utilizes a custom $O(\log N)$ **Segment Tree** data structure over a 10-year day-by-day array to deliver lightning-fast custom date range queries and real-time rolling calculations.
- **📊 Settlement & Naturalisation Timeline**
  - Calculates your exact **Target ILR Settlement Date**, **Earliest ILR Application Date** (28 days prior), and **Target Naturalisation Date**.
- **🎨 Modern Responsive Vuetify 3 UI**
  - Features Union Jack Dark/Light theme toggling, context-aware absence record editor with smart departure-to-return date constraints (`min` date picker bound), event status chips (Planned / Ongoing / Past), and confirmation dialogs.
- **💾 Local Persistence & Data Export/Import**
  - Data persists automatically in `localStorage`.
  - Supports **YAML Export/Import** for backups and cross-device migration.
- **📱 Progressive Web App (PWA)**
  - Built with `vite-plugin-pwa` for offline capability and automatic update notifications via `ReloadPrompt.vue`.

---

## 📐 UK Home Office Rules Overview

| Stage | Rule | Requirement / Limit | Description |
| :--- | :--- | :--- | :--- |
| **General** | **Full Day Absence** | Departure & Return Excluded | Only full 24-hour days spent entirely outside the UK count as days absent. Departure and arrival dates are excluded. |
| **ILR** | **Rolling 12-Month Limit** | Max **180 days** | No more than 180 days absent in any continuous rolling 365-day period across the 5 years. |
| **ILR** | **Qualifying Period** | **5 Years** | 5 years continuous residence starting from BNO Visa Grant Date or UK Arrival Date. |
| **ILR** | **Earliest Application** | **28 Days Prior** | ILR application can be submitted up to 28 days before completing the 5-year qualifying period. |
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
│   ├── stores/            # Pinia store & Segment Tree
│   │   └── absents.js     # Main store (useAbsentsStore) & AbsenceSegmentTree
│   ├── views/             # Main application views
│   │   └── AbsenceView.vue# Main dashboard page
│   ├── App.vue            # Root component with App Bar & Theme switcher
│   └── main.js            # Vue app bootstrap
├── .antigravity.md        # AI Agent workspace context & developer guidelines
├── .gitlab-ci.yml         # GitLab CI/CD pipeline for GitLab Pages
├── index.html             # HTML entry template
├── package.json           # App manifest and dependencies
└── vite.config.js         # Vite build configuration with Vuetify & VitePWA
```

### Key Data Structures & Store

- **[AbsenceSegmentTree](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L29)**: An array-backed segment tree (`Int32Array`) supporting $O(\log N)$ point updates and range sum queries over a 10-year period (3,653 days). Used for instant calculation of custom date range queries and rolling 12-month maximum calculations.
- **[useAbsentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L215)**: Pinia store handling absence records, key visa/arrival/ILR dates, auto-arrival record synchronization, local storage persistence, and YAML export/import.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

*This application is provided for informational and personal tracking purposes only. It does not constitute official legal or immigration advice. Always verify your eligibility and dates against official UK Home Office guidelines before submitting an ILR or Naturalisation application.*

