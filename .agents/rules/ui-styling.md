# Global Styling & UI Guidelines for Agents

All AI agents and developers modifying or creating UI components in **bno-5plus1-tracker** must strictly adhere to the following design system and styling standards to ensure visual consistency, accessibility, and theme harmony across the entire web application:

---

## 1. Color Palette & Semantic System ([vuetify.js](../../src/plugins/vuetify.js))

- **Primary Accent (`primary`)**:
  - Light Theme: Official Union Jack Royal Navy Blue (`#012169`).
  - Dark Theme: Regal Royal Navy Blue (`#4A90E2`).
  - _Usage_: Main header banners, primary action buttons, active tab indicators, primary icons, and brand elements.
- **Secondary Accent (`secondary`)**:
  - Light Theme: Union Jack Crimson Red (`#C8102E`).
  - Dark Theme: Union Jack Crimson Red (`#CF142B`).
  - _Usage_: Highlighting mobile viewport tags, promotional callout chips, and secondary visual accents.
- **Status & Compliance Colors**:
  - `success` (`#059669` light / `#10B981` dark): Compliant state badges ("Within Limit", "Passed", "Verified").
  - `warning` (`#D97706` light / `#F59E0B` dark): Threshold alert badges ("Approaching Limit", "Delayed Window", "Visa Expiry Warning").
  - `error` (`#C8102E` light / `#CF142B` dark): Non-compliant state badges ("Limit Exceeded", destructive action dialogs).
  - `info` (`#0284C7` light / `#64B5F6` dark): Information alerts and secondary help text.
- **Background & Surfaces**:
  - Page Background (`background`): Off-White (`#F4F6F9` light) / Deep Royal Navy Dark (`#0B132B` dark).
  - Card & Container Surface (`surface`): Pure White (`#FFFFFF` light) / Slate Royal Navy (`#1C2541` dark).

---

## 2. Page & Card Container Architecture

- **Max Width Container**: All primary view pages (`AbsenceView.vue`, `DocumentView.vue`, `ReferenceView.vue`, `InstructionView.vue`) must wrap their root layout in a centered container with `max-width: 1400px; margin: 0 auto;`.
- **Page Header Banner**: Standardized at the top of each view using `<v-card color="primary" class="mb-4 rounded-lg elevation-3" variant="elevated">` containing `<v-card-text class="pa-6 text-white">`, featuring an icon (`v-icon` size `x-large`), H1 title (`text-h4 font-weight-bold mb-1`), and subtitle (`text-subtitle-1 text-medium-emphasis`).
- **Standard Card Containers**: Use `<v-card class="rounded-lg elevation-2 bg-surface">` for content sections. Sub-cards, filter bars, and control panels use `elevation-1 pa-3 border` with `rounded-lg`.
- **Border Radius**: Always specify `rounded-lg` (8px border radius) on `v-card`, `v-alert`, `v-btn-toggle`, `v-chip`, and modal dialogs to maintain unified curved corners.

---

## 3. Layout Grid & Content Alignment

- **Top Alignment for Grid Columns**: In step-by-step tabs, feature cards, and multi-column grid layouts (`v-row`), always specify `<v-row align="start">` so text columns, lists, and action buttons gravitate to the top of cards rather than drifting to vertical center.
- **Flexbox Spacing Utilities**: Use Vuetify 3 gap utilities (`ga-2`, `ga-3`) combined with `d-flex align-center flex-wrap` for inline controls, headers, and chip groups. Avoid hardcoded inline CSS margins on flex child items.
- **Card Inner Padding**:
  - Primary Header Banners: `pa-6`
  - Main Section Cards: `pa-4`
  - Controls, Filter Bars & Sub-cards: `pa-3` or `pa-2`

---

## 4. Component Patterns & Typography Hierarchy

- **Section Titles**: Format card titles as `<v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">` paired with a leading `v-icon` (colored `primary` or context color).
- **Body & Captions**: Use `text-body-1` for primary paragraphs, `text-body-2` for list items and panel text, `text-subtitle-2 font-weight-bold` for section subheadings, and `text-caption text-medium-emphasis` for captions and timestamps.
- **Primary Buttons**: `<v-btn color="primary" variant="flat" prepend-icon="mdi-...">` with clear verb labels.
- **Secondary Buttons**: `<v-btn color="primary" variant="outlined">` or `<v-btn variant="tonal">`.
- **Table Row Action Menus**: Use 3-dots vertical action menus (`v-menu`) activated by `<v-btn icon="mdi-dots-vertical" variant="text" size="small">` with compact menu lists (`v-list density="compact"`).
- **Status Badges**: Use `<v-chip size="x-small" class="font-weight-bold" :color="...">` with explicit semantic status colors.

---

## 5. Media & Responsive Design Guidelines

- **Responsive Breakpoint Hooks**: Use Vuetify's `$vuetify.display.smAndDown` breakpoint hook for switching responsive layouts, drawer overlays, and mobile vs desktop viewport media.
- **Image Containers**: Wrap screenshot and preview images in `<v-img contain class="rounded border shadow-sm w-100">` with an explicit `maxHeight` property and a loading placeholder template (`<v-progress-circular indeterminate color="primary">`).
- **Dark/Light Theme Compatibility**: Never hardcode inline hex colors for text or backgrounds (e.g. `color: #000`). Use Vuetify theme color classes (`text-primary`, `bg-surface`, `text-medium-emphasis`) or CSS custom properties to ensure 100% theme compatibility.

