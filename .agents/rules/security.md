# Security Rules & Data Privacy Guardrails

**bno-5plus1-tracker** deals with sensitive personal data of BNO visa holders (travel logs, National Insurance numbers, UK residential addresses, identity documents, and residence proof files). Maintaining strict privacy and security boundaries is paramount.

---

## 1. Zero External Telemetry & Local-First Architecture

- **No Remote Data Exfiltration**: Never send personal tracking data, user inputs, or file blobs to any remote server or third-party API.
- **Client-Side Only Persistence**: All application state resides exclusively on the user's local machine via browser `IndexedDB` (`bno_tracker_db`) and `localStorage` (`bno_tracker_locale`, `bno_tracker_active_profile`).
- **No Third-Party Analytics Trackers**: Do not introduce analytics scripts, session recorders (e.g. Hotjar, Google Analytics), or tracking pixels.

---

## 2. File Storage & Upload Guardrails

- **File Size Limit**: Strictly enforce the maximum file size limit of **10 MB** per uploaded document in `fileStorageService.js`.
- **MIME & Format Sanitization**: Supported document vault file formats are limited to documents and images (PDFs, PNG, JPEG, WEBP).
- **Blob Object URL Lifecycle**: Always revoke temporary object URLs (`URL.revokeObjectURL`) when document preview windows or dialogs close to avoid memory leaks.
- **Direct New-Tab Viewing**: Ensure file viewing (`window.open`) handles local object URLs safely without opening unconstrained external navigation.

---

## 3. Strict Schema Validation & Backup Parsing

- **YAML Schema Enforcement**: When parsing imported YAML files (`backupService.js`), strictly route through `schemaValidationService.js` before mutating Pinia stores.
- **Path Traversal Protection**: When unpacking ZIP backup archives (`zipService.js`), ensure that file paths inside the archive (`files/<folderId>/<filename>`) cannot traverse directories (e.g., prevent `../` or absolute path escapes).
- **ID Normalization**: Generate unique IDs strictly via `src/utils/id.js` and validate existing IDs during import to prevent collision or overwriting between profiles.

---

## 4. Sensitive PII Formatting & Display

- **National Insurance (NI) Numbers**: Format standard UK NI numbers in space-delimited pairs (`QQ 12 34 56 A`).
- **UK Address History**: Treat residential address records with proper privacy; never log full address records or postcode searches to external consoles or unhandled error traces in production builds.

---

## 5. Security Auditing & Vulnerability Management

- Regularly audit npm dependencies for known CVEs using `npm audit`.
- Keep dependencies updated within tested SemVer ranges to remediate known security advisories.

