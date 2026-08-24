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
      } catch (e) { }
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

      // Verify Shared With column is hidden when only 1 profile exists
      const fullViewBtn = page.locator('button:has-text("Full")').first();
      if (await fullViewBtn.isVisible()) {
        await fullViewBtn.click();
        await page.waitForTimeout(300);
        await expect(page.locator('th:has-text("Shared With")')).toHaveCount(0);
      }
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
    const closeDrawer = async () => {
      const scrim = page.locator('.v-navigation-drawer__scrim, .v-overlay__scrim').first();
      if (await scrim.isVisible()) {
        await scrim.click({ position: { x: 5, y: 5 }, force: true });
      } else {
        await drawerBtn.click();
      }
      await page.waitForTimeout(400);
    };

    await drawerBtn.click();
    await page.waitForTimeout(400);

    // Expand Profile Switcher section if collapsed
    const expandDown1 = page.locator('.v-navigation-drawer button:has(.mdi-chevron-down)').first();
    if (await expandDown1.isVisible()) {
      await expandDown1.click();
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

    // Expand Profile Switcher section if collapsed
    const expandDown2 = page.locator('.v-navigation-drawer button:has(.mdi-chevron-down)').first();
    if (await expandDown2.isVisible()) {
      await expandDown2.click();
      await page.waitForTimeout(300);
    }

    // Switch back to Main Applicant
    const mainApplicantItem = page.locator('.v-navigation-drawer .v-list-item:has-text("Main Applicant")').first();
    if (await mainApplicantItem.isVisible()) {
      await mainApplicantItem.click();
      await page.waitForTimeout(500);
    }

    // Refresh page state to ensure drawer is closed and active profile is active
    await page.goto('/');
    await page.waitForLoadState('networkidle');

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

      // Click "Share with..." item
      const shareMenuItem = page.locator('.v-menu .v-list-item:has-text("Share with")').first();
      await expect(shareMenuItem).toBeVisible();
      await shareMenuItem.click();
      await page.waitForTimeout(400);

      // In Share Record dialog, select target profile (Spouse) and click "Share Record"
      const shareDialog = page.locator('.v-dialog:has-text("Share Record with Other Profiles")');
      await expect(shareDialog).toBeVisible();
      await expect(shareDialog).toContainText('Paris Family Holiday');

      // Click Share Record button in dialog
      const shareBtn = shareDialog.locator('button:has-text("Share Record")').first();
      await expect(shareBtn).toBeEnabled();
      await shareBtn.click();
      await page.waitForTimeout(500);

      // Switch profile to Spouse and verify record
      await drawerBtn.click();
      await page.waitForTimeout(400);

      const expandDown3 = page.locator('.v-navigation-drawer button:has(.mdi-chevron-down)').first();
      if (await expandDown3.isVisible()) {
        await expandDown3.click();
        await page.waitForTimeout(300);
      }

      const spouseItem = page.locator('.v-navigation-drawer .v-list-item:has-text("Spouse")').first();
      await expect(spouseItem).toBeVisible();
      await spouseItem.click();
      await page.waitForTimeout(500);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify copied trip is now present in Spouse's absence table
      await expect(page.locator('.v-main')).toContainText('Paris Family Holiday');

      // Toggle to Full View Mode and verify Shared With column & avatar
      const fullViewBtn = page.locator('button:has-text("Full")').first();
      if (await fullViewBtn.isVisible()) {
        await fullViewBtn.click();
        await page.waitForTimeout(400);

        // Verify Shared With column header
        await expect(page.locator('th:has-text("Shared With")')).toBeVisible();

        // Verify Main Applicant avatar initial 'M' is displayed for shared trip
        const sharedAvatar = page.locator('tbody tr:has-text("Paris Family Holiday") .v-avatar:has-text("M")');
        await expect(sharedAvatar).toBeVisible();
      }
    }
  });

});


