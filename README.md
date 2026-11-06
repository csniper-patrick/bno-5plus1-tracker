# BNO 5+1 Tracker

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d.svg?logo=vuedotjs)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff.svg?logo=vite)](https://vite.dev/)
[![Vuetify 3](https://img.shields.io/badge/Vuetify-3.7-1867c0.svg?logo=vuetify)](https://vuetifyjs.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.1-yellow.svg)](https://pinia.vuejs.org/)
[![vue-i18n](https://img.shields.io/badge/vue--i18n-11.4-green.svg)](https://vue-i18n.intlify.dev/)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-blue.svg)](src/locales)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?logo=pwa)](https://github.com/vite-pwa/vite-plugin-pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

BNO 5+1 Tracker is an unofficial web application for British National (Overseas) visa holders. You can track travel absences, test certificates, residence documents, and address history in the United Kingdom. The application calculates qualifying timelines for Indefinite Leave to Remain (ILR) and British Citizenship.

This application is an independent third-party tool. The application is not affiliated with, endorsed by, or connected to the UK Home Office or the UK Government.

---

## Key Features

- Internationalization: The user interface supports English (`en`) and Traditional Chinese (`zh-HK`). You can switch the language in the top bar. The application saves your language preference to local storage.
- Day-count calculations: Departure and return dates are excluded from absent day counts. The Home Office counts only full 24-hour days outside the UK as absences.
- Key date tracking: You can record your visa start date, your UK arrival date, your visa expiration date, and your approved settlement date. If your arrival date differs from your visa start date, the application creates an initial absence record.
- Settlement absence monitoring: The application calculates absent days in each rolling 12-month period. If absences exceed 180 days in a period, the application delays the 5-year qualifying window forward to the earliest compliant date.
- Citizenship absence monitoring: The application evaluates the 450-day limit for the 5-year period and the 90-day limit for the final 12 months. The application makes sure that you were physically present in the UK exactly 5 years before the application date. It enforces an inclusive lower bound of today (UTC midnight) for the earliest citizenship application date so past candidate dates are never suggested, and displays an immediate eligibility banner when you can apply today.
- Custom range query synchronization: The custom date range query tool automatically resets its date boundaries to match the active 20-year tracking period whenever key dates change, backup data is imported, or the active profile is switched.
- Visa summary card: The card shows your visa start date, your visa expiration date, and your earliest settlement date. If your visa expires before your settlement date, the card shows a warning.
- Qualification tracking: You can record your National Insurance number, your Life in the UK test details, and your English B1 qualification pathway.
- Continuous residence checklist: You can track residence evidence across years 1 through 5, including council tax, tax records, bank statements, and utility bills.
- Address history log: You can record past UK residential addresses with move-in dates, move-out dates, postal codes, and tenancy types.
- Document vault: You can store files up to 10 MB in the browser. You can organize files into folders, view files in a new tab, and link files to checklist items.
- User guide: An interactive guide shows desktop and mobile screen captures, feature steps, and answers to common operational questions.
- Guidance and community links: The reference page lists official UK Government guidance documents, statutory rules, tax guides, and verified non-government organization channels.
- Multi-profile management: You can track records for multiple family members in isolated profiles. You can share travel journeys across profiles that meet visa date requirements. Edits to shared journeys update across all linked profiles.
- Data export and import: You can export your data as a `.zip` archive that contains a YAML backup, a file manifest, and stored documents. You can import `.zip` archives or standalone `.yaml` files.
- Segment tree calculations: The calculation engine uses a segment tree data structure to compute exact date-to-date range queries in logarithmic time and point queries in constant time.
- Search engine optimization: Pre-rendered static pages include metadata tags, social preview images, and Schema.org structured data.
- Local storage and privacy: The application stores your data only in browser IndexedDB storage on your device. The application does not send data to external servers.
- Offline support: The progressive web application runs offline on desktop and mobile browsers.

---

## UK Home Office Rules Summary

| Stage          | Rule                   | Limit or requirement                | Description                                                                                                                             |
| :------------- | :--------------------- | :---------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| General        | Full day absence       | Departure and return dates excluded | Only full 24-hour days outside the UK count as absences. Departure and arrival dates do not count as absences.                          |
| ILR            | Rolling 12-month limit | Maximum 180 days                    | Absences must not exceed 180 days in any rolling 12-month period during the qualifying period.                                           |
| ILR            | Qualifying period      | 5-year sliding window               | Continuous residence lasts 5 years from your visa start date or UK arrival date. The window shifts forward if absences exceed 180 days. |
| ILR            | Visa expiration        | Set by visa                         | Visas last 5 years by default. The application shows an alert if your visa expires before your earliest settlement date.                |
| ILR            | Earliest application   | 28 days before                      | You can submit your settlement application up to 28 days before you complete 5 years of continuous residence.                           |
| Qualifications | Mandatory tests        | Life in the UK and English B1       | You must pass the Life in the UK test and meet the English B1 requirement for settlement and citizenship.                               |
| Residence      | Address proof          | 5-year history                      | You must provide evidence of address, such as council tax bills, tax records, and utility bills.                                        |
| Citizenship    | 5-year absence limit   | Maximum 450 days                    | Total absences must not exceed 450 days in the 5 years before your application date.                                                    |
| Citizenship    | Final 12-month limit   | Maximum 90 days                     | Total absences must not exceed 90 days in the 12 months before your application date.                                                   |
| Citizenship    | Physical presence      | Present in the UK                   | You must have been physically present in the UK on the exact date 5 years before your application date.                                 |

---

## Quick Start

### Prerequisites

Make sure that your system has the required software:

- Node.js version `^22.18.0` or `>=24.12.0`
- npm version `^10.0.0` or higher

### Installation and Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/bno-5plus1-tracker.git
   cd bno-5plus1-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`.

---

## NPM Scripts

| Command                       | Description                                                     |
| :---------------------------- | :-------------------------------------------------------------- |
| `npm run dev`                 | Starts the Vite development server with hot module replacement. |
| `npm run build`               | Compiles the production bundle into the `dist/` directory.      |
| `npm run preview`             | Serves the local production build from the `dist/` directory.   |
| `npm run test`                | Runs all unit tests and Playwright end-to-end tests.            |
| `npm run test:unit`           | Runs the Node.js native unit test suite.                        |
| `npm run test:e2e`            | Runs Playwright browser tests in headless mode.                 |
| `npm run test:e2e:ui`         | Opens the Playwright test runner in interactive mode.           |
| `npm run capture:screenshots` | Generates desktop and mobile screenshots for the user guide.    |
| `npm run format`              | Formats source files with Prettier.                             |

---

## Project Architecture

```text
bno-5plus1-tracker/
├── e2e/                       # Playwright end-to-end and screenshot tests
│   ├── app-ui.spec.js                             # End-to-end user flow test suite
│   └── generate-instruction-screenshots.spec.js   # Automated screenshot generator
├── public/                    # Static assets, icons, social banner, and guide images
│   ├── instructions/          # Desktop and mobile guide screenshots
│   ├── og-image.png           # Social preview banner
│   └── og-image.svg           # Vector source for social preview banner
├── src/
│   ├── assets/                # Global stylesheet files
│   ├── components/            # UI components
│   │   ├── absence/           # Absence tracker subcomponents
│   │   │   ├── AbsenceFormCard.vue               # Travel record editor
│   │   │   ├── AbsenceOverviewHeader.vue         # Visa overview banner
│   │   │   ├── AbsenceRecordsTable.vue           # Absence list table
│   │   │   ├── AbsenceRuleStatusCards.vue        # Absence rule status cards
│   │   │   ├── AbsenceShareDialog.vue            # Profile journey sharing dialog
│   │   │   ├── DateRangeQueryCard.vue            # Custom date range query card
│   │   │   └── KeyDatesDialog.vue                # Key visa dates modal dialog
│   │   ├── document/          # Document and qualification subcomponents
│   │   │   ├── AddressHistorySection.vue         # UK address history table and dialogs
│   │   │   ├── DocumentHeaderCard.vue            # Readiness chart and status summary
│   │   │   ├── DocumentVaultSection.vue          # File upload area and file table
│   │   │   ├── EnglishLanguageCard.vue           # English B1 pathway card
│   │   │   ├── LifeInUkCard.vue                  # Life in the UK test card
│   │   │   ├── NationalInsuranceCard.vue         # National Insurance card
│   │   │   └── ResidenceChecklistSection.vue     # Continuous residence checklist
│   │   ├── ProfileDrawerSection.vue              # Profile drawer selector
│   │   ├── ProfileManagementDialog.vue           # Profile management dialog
│   │   └── ReloadPrompt.vue                      # Service worker update prompt
│   ├── locales/               # Translation dictionary files
│   │   ├── en.js              # English dictionary
│   │   └── zh-HK.js           # Traditional Chinese dictionary
│   ├── plugins/               # Vuetify and i18n initialization
│   ├── router/                # Vue Router route definitions
│   ├── services/              # Data services and file operations
│   │   ├── dbService.js               # IndexedDB initialization and schema migration
│   │   ├── fileStorageService.js      # IndexedDB binary file storage service
│   │   ├── backupService.js           # YAML export and import service
│   │   ├── zipService.js              # ZIP backup compression and extraction
│   │   ├── profileService.js          # Multi-profile data swapping service
│   │   └── schemaValidationService.js # YAML and manifest schema validation
│   ├── stores/                # Pinia state stores
│   │   ├── absents.js         # Absence records and segment tree state
│   │   ├── documents.js       # Document records and file metadata state
│   │   └── profiles.js        # Multi-profile state
│   ├── utils/                 # Utility functions
│   │   ├── date.js            # Date parsing and calculation utilities
│   │   ├── segmentTree.js     # Segment tree data structure
│   │   ├── seo.js             # Metadata and structured data generator
│   │   ├── format.js          # String formatting helpers
│   │   └── id.js              # Unique identifier generator
│   ├── views/                 # Primary page views
│   │   ├── AbsenceView.vue    # Absence tracker view
│   │   ├── DocumentView.vue   # Document readiness view
│   │   ├── ReferenceView.vue  # Guidance links view
│   │   └── InstructionView.vue# User guide view
│   ├── App.vue                # Main layout with navigation drawer
│   └── main.js                # Application initialization entrypoint
├── tests/                     # Automated unit tests
│   ├── tracker.test.js                # Absence store and segment tree tests
│   ├── profiles.test.js               # Multi-profile isolation and sync tests
│   ├── components_and_e2e.test.js     # Component integration tests
│   ├── indexeddb_emulation.test.js    # IndexedDB storage tests
│   ├── seo.test.js                    # Metadata and sitemap generator tests
│   └── validation.test.js             # Schema validation and date tests
├── AGENTS.md                  # AI agent context router
├── .agents/                   # Modular agent rules, workflows, skills, and documentation
├── .gitlab-ci.yml             # GitLab CI deployment pipeline
├── index.html                 # HTML entry template
├── package.json               # Package dependencies and scripts
├── playwright.config.js       # Playwright test configuration
└── vite.config.js             # Vite build configuration
```

### Key Modules and Data Structures

- [AbsenceSegmentTree](src/utils/segmentTree.js): A canonical power-of-2 iterative segment tree using an `Int32Array` buffer with capacity for 8,192 days (~22.4 years). It supports direct mathematical leaf addressing in $O(1)$, single-pass batch builds in $O(K)$, iterative range updates in $O(D + \log K)$, and branchless range sum queries in $O(\log K)$ with $O(1)$ single-leaf and full-tree root fast-paths.
- [seo.js](src/utils/seo.js): An engine that creates search metadata and structured data. It reads base URLs from GitLab CI variables. It creates page titles, descriptions, canonical links, social preview tags, and Schema.org JSON-LD definitions. It also creates `sitemap.xml` and `robots.txt` files during build.
- [date.js](src/utils/date.js): A utility for date calculations in UTC. It parses and formats `YYYY-MM-DD` strings and caches `Intl.DateTimeFormat` instances for display formatting. It calculates absent days, computes day offsets, and finds date boundaries for the segment tree.
- [dbService.js](src/services/dbService.js): A database service for browser IndexedDB storage. It initializes database schema version 2. It manages the `app_state` store for key-value data and the `files` store for document blobs.
- [fileStorageService.js](src/services/fileStorageService.js): A service that manages document files in IndexedDB. It stores and retrieves binary data, creates temporary object URLs for viewing, and enforces a 10 MB file size limit.
- [profileService.js](src/services/profileService.js) and [useProfilesStore](src/stores/profiles.js): Services that manage data for multiple user profiles. They swap active profile data, duplicate profiles, and index shared journeys in $O(1)$ between family members who meet visa start date rules.
- [schemaValidationService.js](src/services/schemaValidationService.js): A validation service that inspects imported YAML backups and ZIP manifests. It rejects corrupted files, invalid dates, and malformed records.
- [backupService.js](src/services/backupService.js): A service that exports and imports application data as YAML files with comments.
- [zipService.js](src/services/zipService.js): An archiving service that packages application state, manifest indexes, and document files into `.zip` archives.
- [locales/](src/locales): Translation files for English (`en.js`) and Traditional Chinese (`zh-HK.js`). They supply translated text for all views, dialogs, badges, and guidance cards.
- [useAbsentsStore](src/stores/absents.js): A Pinia store for travel records, key dates, and absence calculations. It synchronizes records with the segment tree, monitors rolling 12-month limits with violation-jump shifting, enforces naturalisation earliest application lower bounds, computes individual rule coloring states, and tracks data import and reload versions to synchronize custom range queries.
- [useDocumentsStore](src/stores/documents.js): A Pinia store for settlement requirements. It tracks test records, address history entries, residence checklists, and indexed file metadata.

### Development and Maintenance Routines

- Screenshot capture procedure:
  1. Run `npm run capture:screenshots` to start the Playwright capture script.
  2. The script populates sample dates, journeys, test records, and address history.
  3. The script captures seven desktop screenshots (`1280x800`) in `public/instructions/step*.png`.
  4. The script captures seven mobile screenshots (`390x844`) in `public/instructions/narrow_step*.png`.
  5. The user guide in `InstructionView.vue` switches between desktop and mobile images based on screen width.
- Documentation maintenance routine:
  1. Update documentation after you change system architecture, store schemas, user interface features, dependencies, or scripts.
  2. Make sure that descriptions, tables, directory trees, and guidelines match across [README.md](README.md), [AGENTS.md](AGENTS.md), and the modular [.agents/](.agents/) directory.

---

## Official and Community Resources

The application provides access to official UK Government resources and community organizations through the reference page:

- [BNO Visa: Settle in the UK (ILR Guidance)](https://www.gov.uk/british-national-overseas-bno-visa/settle-in-the-uk): Home Office guidance on settlement requirements, continuous residence, and absence limits.
- [Hong Kong BN(O) Route Caseworker Guidance](https://www.gov.uk/government/publications/hong-kong-british-national-overseas-route): Home Office caseworker instructions for evaluating applications and settlement.
- [Immigration Rules Appendix Hong Kong BN(O)](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-hong-kong-british-national-overseas): Statutory rules for the BNO route enacted by UK Parliament.
- [HMRC Statutory Residence Test Guidance (RDR3)](https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt): Tax residence rules, day-counting procedures, and split-year treatment.
- [Prove Your Right to Work in the UK](https://www.gov.uk/prove-right-to-work): Digital share code service for employment status checks.
- [Prove Your Right to Rent in the UK](https://www.gov.uk/prove-right-to-rent): Digital share code service for tenancy checks in England.
- [View and Prove Your Immigration Status](https://www.gov.uk/view-prove-immigration-status): UKVI portal to access your eVisa record and update travel document numbers.
- [Register to Vote in the UK](https://www.gov.uk/register-to-vote): Electoral registration portal for Commonwealth citizens living in the UK.
- [NHS UK Global Health Insurance Card Application](https://www.nhs.uk/using-the-nhs/healthcare-abroad/apply-for-a-free-uk-global-health-insurance-card-ghic/): Portal to apply for a free GHIC card for medical treatment in the European Union.
- [Life in the UK Test Official Booking Portal](https://www.gov.uk/life-in-the-uk-test): Booking portal, test center locator, and identification rules for the citizenship test.
- [Prove Your Knowledge of English (B1 Level)](https://www.gov.uk/english-language): Recognized test providers and qualifications that satisfy the B1 English requirement.
- [Ecctis Qualification Recognition](https://www.ecctis.com/): UK national agency that verifies foreign degree equivalency and English proficiency.
- [Apply for British Citizenship by Naturalisation (Form AN)](https://www.gov.uk/apply-citizenship-indefinite-leave-to-remain): Guidance and requirements for citizenship applications after settlement.
- [Good Character Caseworker Guidance](https://www.gov.uk/government/publications/good-character-guidance): Home Office standards for evaluating character and legal compliance.
- [Hongkongers in Britain](https://www.hongkongers.org.uk/): Registered charity that provides integration support, employment advice, and community services.
- [Hong Kong Watch](https://www.hongkongwatch.org/): Registered organization that advocates for the rights of BNO visa holders.
- [Citizens Advice UK](https://www.citizensadvice.org.uk/): Independent advice network that provides free guidance on housing, employment, and legal rights.
- [Hong Kong Well UK](https://www.hongkongwell.uk/): Community organization that provides mental health counseling and educational support.
- [Hong Kong Aid](https://www.hkaid.org.uk/): Community organization that provides immigration advice, crisis assistance, and temporary housing support.
- [The Migration Observatory](https://migrationobservatory.ox.ac.uk/): Research group at the University of Oxford that provides data on UK migration trends.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Disclaimer and Privacy Notice

This application is an independent third-party tool for personal tracking only. It is not an official application. It is not affiliated with, endorsed by, or connected to the UK Home Office or the UK Government. It does not provide legal or immigration advice.

All data remains on your local device. The application stores absence history, dates, test records, address history, and files in your browser IndexedDB storage. The application uses no remote database and sends no data to external servers.

Before you submit a settlement or citizenship application, make sure that your dates and eligibility match official UK Home Office guidance.
