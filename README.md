# BNO 5+1 Tracker 🇬🇧✈️

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d.svg?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff.svg?logo=vite)](https://vite.dev/)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3.7-1867c0.svg?logo=vuetify)](https://vuetifyjs.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0-yellow.svg)](https://pinia.vuejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, high-performance web application designed for **British National (Overseas) (BNO) visa holders** to track, calculate, and manage absences from the United Kingdom on the "5+1" route toward **Indefinite Leave to Remain (ILR / UK Settlement)** and British Citizenship.

---

## 🌟 Key Features

- **✈️ UK Home Office Compliant Absence Calculation**
  - Automatically excludes departure (start) and return (end) dates from full-day absence counts, matching UK Home Office rules (days where part of the 24 hours is spent in the UK do not count as full days absent).
- **📅 Visa & Arrival Date Synchronization**
  - Track both your **BNO Visa Start Date** and actual **UK Arrival Date**.
  - Automatically generates and syncs initial pre-arrival absence records if your UK arrival date differs from your visa start date.
- **🛡️ Continuous Rolling 12-Month Limit Monitoring**
  - Evaluates absences across all continuous rolling 365-day windows during your 5-year qualifying period to ensure compliance with the **180-day maximum limit** for ILR.
- **⚡ High-Performance Segment Tree Engine (`AbsenceSegmentTree`)**
  - Utilizes a custom $O(\log N)$ **Segment Tree** data structure over a 10-year day-by-day array to deliver lightning-fast custom date range queries and real-time rolling calculations.
- **📊 5-Year Residency Timeline & Yearly Breakdown**
  - Calculates your exact **Target ILR Settlement Date**.
  - Displays structured breakdown for Year 1, Year 2, Year 3, Year 4, and Year 5 absence totals with visual warning indicators (Compliant / Caution / Non-Compliant).
- **🎨 Modern Responsive Vuetify 3 UI**
  - Beautiful dashboard cards, status chips, responsive tables, and seamless **Dark / Light Mode** theme toggling.
- **💾 Local Persistence & Data Export/Import**
  - Data persists automatically in `localStorage`.
  - Supports **JSON Export/Import** for backups and **CSV Export** for easy record-keeping.
  - One-click sample data loading to preview app capabilities instantly.

---

## 📐 UK Home Office Rules Overview

| Rule | Requirement |
| :--- | :--- |
| **Full Day Absence** | Only full 24-hour days spent entirely outside the UK count as days absent. Departure and arrival dates are excluded. |
| **Rolling 12-Month Limit** | No more than **180 days** absent in any continuous rolling 12-month period across the 5 years. |
| **Qualifying Period** | 5 years continuous residence starting from BNO Visa Grant Date or UK Arrival Date. |

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
├── src/
│   ├── assets/            # Global styles and static assets
│   ├── components/        # Reusable UI components
│   ├── plugins/           # Vuetify 3 configuration (vuetify.js)
│   ├── router/            # Vue Router routes (index.js)
│   ├── stores/            # Pinia store state management
│   │   └── absents.js     # Main store & AbsenceSegmentTree implementation
│   ├── views/             # Main application views
│   │   └── AbsenceView.vue# Tracker dashboard page
│   ├── App.vue            # Root component with App Bar & Theme switcher
│   └── main.js            # Vue app bootstrap
├── .antigravity.md        # Workspace context & developer guidelines
├── .gitlab-ci.yml         # GitLab CI/CD pipeline configuration for GitLab Pages
├── package.json           # App manifest and scripts
└── vite.config.js         # Vite configuration with Vuetify plugin
```

### Key Data Structures

- **[AbsenceSegmentTree](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L23)**: An array-backed tree allowing point updates and range queries in $O(\log N)$ time over 3,653 days (10 years). Used for instant calculation of custom date range queries and rolling 12-month maximum calculations.
- **[useAbsentsStore](file:///Users/csniper/Projects/bno-5plus1-tracker/src/stores/absents.js#L147)**: Pinia store handling absence records, visa dates, auto-arrival record synchronization, local storage persistence, and JSON/CSV export formatting.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

*This application is provided for informational and personal tracking purposes only. It does not constitute official legal or immigration advice. Always verify your eligibility and dates against official UK Home Office guidelines before submitting an ILR application.*
