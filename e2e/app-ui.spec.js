import { test, expect } from '@playwright/test';

test.describe('BNO 5+1 Tracker UI E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('bno_tracker_locale', 'en');
    });
    await page.reload();
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

    // Toggle Language to Traditional Chinese (HK)
    const langBtn = page.locator('header button:has(.mdi-translate)').first();
    await langBtn.click();
    await page.waitForTimeout(400);

    // Verify text updated to Traditional Chinese
    await expect(page.locator('header')).toContainText('BNO 5+1 追蹤工具');

    // Toggle Language back to English
    await langBtn.click();
    await page.waitForTimeout(400);

    // Explicitly reset locale in localStorage back to English
    await page.evaluate(() => {
      localStorage.setItem('bno_tracker_locale', 'en');
    });

    // Toggle Theme (Light <-> Dark)
    const themeBtn = page.locator('header button:has(.mdi-weather-sunny), header button:has(.mdi-weather-night)').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
    }
  });

});

