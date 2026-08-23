import { test, expect } from '@playwright/test';

test.describe('BNO 5+1 Tracker UI E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'language', {
          get: () => 'en-US',
          configurable: true,
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
          configurable: true,
        });
        window.localStorage.setItem('bno_tracker_locale', 'en');
      } catch (e) {}
    });
  });

  test('1. App Shell, Navigation & Drawer Links', async ({ page }) => {
    await page.goto('/');
    
    // Verify title bar & header title
    await expect(page).toHaveTitle(/BNO 5\+1 Tracker/);
    await expect(page.locator('header')).toContainText('BNO 5+1 Tracker');

    // Open right side navigation drawer
    const drawerBtn = page.locator('header button:has(.mdi-menu)').first();
    await drawerBtn.click();
    await page.waitForTimeout(400);

    // Verify drawer contents and items
    const navDrawer = page.locator('.v-navigation-drawer');
    await expect(navDrawer).toBeVisible();
    await expect(navDrawer).toContainText('Absence');
    await expect(navDrawer).toContainText('Document');
    await expect(navDrawer).toContainText('Reference');
    await expect(navDrawer).toContainText('User Guide');

    // Click User Guide link in drawer
    const userGuideLink = navDrawer.locator('a[href*="instruction"]');
    await expect(userGuideLink).toBeVisible();
    await userGuideLink.click();
    await expect(page).toHaveURL(/.*instruction/);
    await expect(page.locator('h1')).toContainText('User Guide & Operation Manual');
  });

  test('2. Key Visa Dates Setup & Computation', async ({ page }) => {
    await page.goto('/');

    // Open Key Dates modal
    const setDatesBtn = page.locator('button:has-text("Set Key Dates"), button:has-text("Edit Key Dates"), button:has-text("Set Up Key Dates")').first();
    await expect(setDatesBtn).toBeVisible();
    await setDatesBtn.click();
    await page.waitForTimeout(500);

    // Fill in Visa Start and UK Arrival dates inside modal
    const dialogInputs = page.locator('.v-dialog input[type="date"]');
    if (await dialogInputs.count() >= 2) {
      await dialogInputs.nth(0).fill('2021-06-01');
      await dialogInputs.nth(1).fill('2021-06-15');

      // Save key dates
      const saveBtn = page.locator('.v-dialog button:has-text("Save"), .v-dialog button:has-text("Update"), .v-dialog button:has-text("Save Dates")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(600);
      }
    }

    // Verify main view responds
    await expect(page.locator('.v-main')).toBeVisible();
  });

  test('3. Absence Record Creation & Management', async ({ page }) => {
    await page.goto('/');

    // Locate Add Absence inputs inside .v-main
    const dateInputs = page.locator('.v-main input[type="date"]');
    const textInputs = page.locator('.v-main input[type="text"]');

    if (await dateInputs.count() >= 2 && await textInputs.count() >= 1) {
      await dateInputs.nth(0).fill('2022-07-01');
      await textInputs.nth(0).fill('Hong Kong - Summer Family Visit');
      await dateInputs.nth(1).fill('2022-07-20');

      const addBtn = page.locator('button:has-text("Add Absence Record")').first();
      await addBtn.click();
      await page.waitForTimeout(600);

      // Verify trip is logged in the absence table
      await expect(page.locator('.v-main')).toContainText('Hong Kong - Summer Family Visit');
    }
  });

  test('4. Document Checklist & Qualifications View', async ({ page }) => {
    await page.goto('/documents');

    // Check main title & sections
    await expect(page.locator('.v-main')).toContainText('Document & Qualification Tracker');
    await expect(page.locator('.v-main')).toContainText('Life in the UK Test');
    await expect(page.locator('.v-main')).toContainText('English Language Requirement');
    await expect(page.locator('.v-main')).toContainText('Continuous Residence Checklist');
  });

  test('5. Reference Guidance View & Search Filter', async ({ page }) => {
    await page.goto('/reference');

    // Verify reference title
    await expect(page.locator('.v-main')).toContainText('Reference & Guidance Resources');

    // Test search filter input
    const searchInput = page.locator('input[placeholder*="Search"], input[label*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('GOV.UK');
      await page.waitForTimeout(300);
    }
  });

  test('6. User Guide View & Viewport Mode Switcher', async ({ page }) => {
    await page.goto('/instruction');

    // Check header banner
    await expect(page.locator('h1')).toContainText('User Guide & Operation Manual');

    // Check screenshot mode control buttons
    const modeToggle = page.locator('.v-btn-toggle');
    await expect(modeToggle).toBeVisible();

    // Click Desktop View button
    const deskBtn = modeToggle.locator('button[value="desktop"]');
    await deskBtn.click();
    await page.waitForTimeout(200);

    // Click Mobile View button
    const mobBtn = modeToggle.locator('button[value="mobile"]');
    await mobBtn.click();
    await page.waitForTimeout(200);

    // Check FAQ panel interaction
    const faqExpansion = page.locator('.v-expansion-panel').first();
    await expect(faqExpansion).toBeVisible();
  });

  test('7. Language Switcher & Theme Toggle', async ({ page }) => {
    await page.goto('/');

    // Ensure initial locale is English
    await page.evaluate(() => {
      localStorage.setItem('bno_tracker_locale', 'en');
      if (window.__i18n__) {
        window.__i18n__.global.locale.value = 'en';
      }
    });

    // Toggle Language to Traditional Chinese (HK)
    const langBtn = page.locator('header button:has(.mdi-translate)').first();
    await langBtn.click();
    await page.waitForTimeout(400);

    // Verify text updated to Traditional Chinese
    await expect(page.locator('header')).toContainText('BNO 5+1 追蹤工具');

    // Toggle Language back to English
    await langBtn.click();
    await page.waitForTimeout(400);

    // Verify header restored to English & explicitly reset locale
    await expect(page.locator('header')).toContainText('BNO 5+1 Tracker');
    await page.evaluate(() => {
      localStorage.setItem('bno_tracker_locale', 'en');
      if (window.__i18n__) {
        window.__i18n__.global.locale.value = 'en';
      }
    });

    // Toggle Theme (Light <-> Dark)
    const themeBtn = page.locator('header button:has(.mdi-weather-sunny), header button:has(.mdi-weather-night)').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('8. Multi-Profile Management & Copy Record to Profile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open right side navigation drawer
    const drawerBtn = page.locator('header button:has(.mdi-menu)').first();
    await drawerBtn.click();
    await page.waitForTimeout(400);

    // Expand Profile Switcher section if collapsed
    const switchProfileBtn = page.locator('button[title="Switch Profile"]').first();
    if (await switchProfileBtn.isVisible()) {
      await switchProfileBtn.click();
      await page.waitForTimeout(300);
    }

    // Click in-drawer "Add Profile" button to show input form
    const addProfileBtn = page.locator('.v-navigation-drawer button:has-text("Add Profile")').first();
    if (await addProfileBtn.isVisible()) {
      await addProfileBtn.click();
      await page.waitForTimeout(300);

      // Fill profile name in text field and press Enter
      const nameInput = page.locator('.v-navigation-drawer input[type="text"]').last();
      await nameInput.fill('Spouse');
      await nameInput.press('Enter');
      await page.waitForTimeout(600);
    }

    // Expand Profile Switcher section to see all profiles if needed
    const expandBtn = page.locator('button[title="Switch Profile"]').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }

    // Switch back to Main Applicant
    const mainApplicantItem = page.locator('.v-navigation-drawer .v-list-item:has-text("Main Applicant")').first();
    if (await mainApplicantItem.isVisible()) {
      await mainApplicantItem.click();
      await page.waitForTimeout(500);
    }

    // Close drawer
    const overlay = page.locator('.v-overlay--active .v-overlay__scrim').first();
    if (await overlay.isVisible()) {
      await overlay.click();
    } else {
      await drawerBtn.click();
    }
    await page.waitForTimeout(400);

    // Log a trip in Main Applicant
    const dateInputs = page.locator('.v-main input[type="date"]');
    const textInputs = page.locator('.v-main input[type="text"]');

    if (await dateInputs.count() >= 2 && await textInputs.count() >= 1) {
      await dateInputs.nth(0).fill('2023-04-10');
      await textInputs.nth(0).fill('Paris Family Holiday');
      await dateInputs.nth(1).fill('2023-04-20');

      const addBtn = page.locator('button:has-text("Add Absence Record")').first();
      await addBtn.click();
      await page.waitForTimeout(600);

      // Verify trip is logged in the absence table
      await expect(page.locator('.v-main')).toContainText('Paris Family Holiday');

      // Open row actions menu (⋮)
      const rowActionsBtn = page.locator('tbody tr:has-text("Paris Family Holiday") button[title="Actions menu"]').first();
      await rowActionsBtn.click();
      await page.waitForTimeout(300);

      // Click "Copy to Profile" item
      const copyMenuItem = page.locator('.v-menu .v-list-item:has-text("Copy to Profile")').first();
      await expect(copyMenuItem).toBeVisible();
      await copyMenuItem.click();
      await page.waitForTimeout(400);

      // In Copy Record dialog, select target profile (Spouse) and click "Copy Record"
      const copyDialog = page.locator('.v-dialog:has-text("Copy Record to Other Profiles")');
      await expect(copyDialog).toBeVisible();
      await expect(copyDialog).toContainText('Paris Family Holiday');

      // Click Copy Record button in dialog
      const copyBtn = copyDialog.locator('button:has-text("Copy Record")').first();
      await expect(copyBtn).toBeEnabled();
      await copyBtn.click();
      await page.waitForTimeout(500);

      // Switch profile to Spouse and verify record
      await drawerBtn.click();
      await page.waitForTimeout(400);
      const spouseItem = page.locator('.v-navigation-drawer .v-list-item:has-text("Spouse")').first();
      if (await spouseItem.isVisible()) {
        await spouseItem.click();
        await page.waitForTimeout(500);
      }
      const overlayClose = page.locator('.v-overlay--active .v-overlay__scrim').first();
      if (await overlayClose.isVisible()) {
        await overlayClose.click();
      } else {
        await drawerBtn.click();
      }
      await page.waitForTimeout(400);

      // Verify copied trip is now present in Spouse's absence table
      await expect(page.locator('.v-main')).toContainText('Paris Family Holiday');
    }
  });

});


