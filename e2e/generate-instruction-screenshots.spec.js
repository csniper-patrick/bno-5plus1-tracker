import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const outputDir = path.join(process.cwd(), 'public', 'instructions')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

test.describe('Generate InstructionView Screenshots', () => {

  async function seedData(page) {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.evaluate(async () => {
      localStorage.clear()

      const appEl = document.querySelector('#app')
      if (!appEl || !appEl._vnode) return

      const proxy = appEl._vnode.component.proxy
      if (proxy && proxy.$pinia) {
        const pinia = proxy.$pinia
        const absentsStore = pinia._s.get('absents')
        const documentsStore = pinia._s.get('documents')

        if (absentsStore) {
          await absentsStore.clearAbsences()
          absentsStore.setVisaAndArrivalDates({
            visaStartDate: '2021-06-01',
            visaExpiryDate: '2026-06-01',
            ukArrivalDate: '2021-06-15'
          })

          // Record 1: Multi-stop trip (Portugal -> Spain)
          absentsStore.addAbsence({
            startDate: '2021-12-20',
            endDate: '2022-01-03',
            dest: 'Portugal ➔ Spain',
            stops: [
              { date: '2021-12-20', dest: 'Portugal' },
              { date: '2021-12-27', dest: 'Spain' },
              { date: '2022-01-03', dest: '' }
            ],
            reason: 'Winter Break in Southern Europe'
          })

          // Record 2: Multi-stop trip (Hong Kong -> Japan -> Taiwan)
          absentsStore.addAbsence({
            startDate: '2022-07-01',
            endDate: '2022-07-25',
            dest: 'Hong Kong ➔ Japan ➔ Taiwan',
            stops: [
              { date: '2022-07-01', dest: 'Hong Kong' },
              { date: '2022-07-10', dest: 'Japan' },
              { date: '2022-07-18', dest: 'Taiwan' },
              { date: '2022-07-25', dest: '' }
            ],
            reason: 'Family Visit & East Asia Tour'
          })

          // Record 3: Single-destination trip (Japan)
          absentsStore.addAbsence({
            startDate: '2023-04-05',
            endDate: '2023-04-18',
            dest: 'Japan - Tokyo & Kyoto',
            stops: [
              { date: '2023-04-05', dest: 'Japan - Tokyo & Kyoto' },
              { date: '2023-04-18', dest: '' }
            ],
            reason: 'Spring Cherry Blossom Trip'
          })

          // Record 4: Multi-stop trip (Italy -> Switzerland -> France)
          absentsStore.addAbsence({
            startDate: '2023-10-10',
            endDate: '2023-10-24',
            dest: 'Italy ➔ Switzerland ➔ France',
            stops: [
              { date: '2023-10-10', dest: 'Italy' },
              { date: '2023-10-15', dest: 'Switzerland' },
              { date: '2023-10-20', dest: 'France' },
              { date: '2023-10-24', dest: '' }
            ],
            reason: 'Autumn Alpine & Europe Tour'
          })

          // Record 5: Single-destination trip (Iceland)
          absentsStore.addAbsence({
            startDate: '2024-03-25',
            endDate: '2024-04-04',
            dest: 'Iceland - Reykjavik',
            stops: [
              { date: '2024-03-25', dest: 'Iceland - Reykjavik' },
              { date: '2024-04-04', dest: '' }
            ],
            reason: 'Northern Lights Holiday'
          })

          // Record 6: Multi-stop trip (France -> Spain)
          absentsStore.addAbsence({
            startDate: '2024-08-05',
            endDate: '2024-08-20',
            dest: 'France ➔ Spain',
            stops: [
              { date: '2024-08-05', dest: 'France' },
              { date: '2024-08-12', dest: 'Spain' },
              { date: '2024-08-20', dest: '' }
            ],
            reason: 'Summer Holiday in Europe'
          })

          // Record 7: Multi-stop trip (Hong Kong -> Singapore)
          absentsStore.addAbsence({
            startDate: '2025-01-20',
            endDate: '2025-02-03',
            dest: 'Hong Kong ➔ Singapore',
            stops: [
              { date: '2025-01-20', dest: 'Hong Kong' },
              { date: '2025-01-27', dest: 'Singapore' },
              { date: '2025-02-03', dest: '' }
            ],
            reason: 'Lunar New Year Family Gathering'
          })
        }

        if (documentsStore) {
          documentsStore.updateLifeInUk({
            status: 'passed',
            testDate: '2024-05-10',
            urn: 'LITUK-99887766',
            testCenter: 'London Test Center'
          })

          documentsStore.updateEnglishTest({
            type: 'b1_selt',
            provider: 'Trinity College London',
            status: 'passed',
            referenceNo: 'TCL-12345678',
            testDate: '2024-03-15'
          })

          documentsStore.updateNationalInsurance({
            number: 'QQ 12 34 56 A',
            status: 'received',
            notes: 'Official HMRC Allocation Letter Received'
          })

          if (documentsStore.addressHistory && documentsStore.addressHistory.length === 0) {
            documentsStore.addAddress({
              addressLine1: '10 Downing Street',
              city: 'London',
              postcode: 'SW1A 2AA',
              startDate: '2021-06-15',
              isCurrent: true,
              housingStatus: 'rented'
            })
          }
        }

        const profilesStore = pinia._s.get('profiles')
        if (profilesStore) {
          await profilesStore.initStore()
          if (profilesStore.profilesList.length <= 1) {
            await profilesStore.createProfile('Spouse', '#E91E63')
            await profilesStore.createProfile('Child (Teen)', '#4CAF50')
            await profilesStore.switchProfile('profile_default')
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  }

  async function populateMultiStopForm(card) {
    const addStopBtn = card.locator('button:has-text("Add Stop"), button:has-text("新增中途站")').first()
    if (await addStopBtn.isVisible()) {
      await addStopBtn.click()
      await card.page().waitForTimeout(300)
    }

    const dateInputs = card.locator('input[type="date"]')
    const textInputs = card.locator('input[type="text"]')

    if (await dateInputs.count() >= 3 && await textInputs.count() >= 2) {
      await dateInputs.nth(0).fill('2025-06-01')
      await textInputs.nth(0).fill('France')
      await dateInputs.nth(1).fill('2025-06-06')
      await textInputs.nth(1).fill('Spain')
      await dateInputs.nth(2).fill('2025-06-15')
    } else if (await dateInputs.count() >= 2 && await textInputs.count() >= 1) {
      await dateInputs.nth(0).fill('2025-06-01')
      await textInputs.nth(0).fill('France ➔ Spain')
      await dateInputs.nth(1).fill('2025-06-15')
    }
  }

  // ---------------------------------------------------------------------------
  // Desktop Screenshots (1280x800)
  // ---------------------------------------------------------------------------
  test('Capture Desktop Screenshots (1280x800)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await seedData(page)

    // 1. step1_overview.png
    await page.goto('/')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'step1_overview.png'),
      fullPage: false
    })

    // 2. step2_key_dates.png
    const setDatesBtn = page.locator('button:has-text("Set Key Dates"), button:has-text("Edit Key Dates"), button:has-text("Set Up Key Dates")').first()
    if (await setDatesBtn.isVisible()) {
      await setDatesBtn.click()
      await page.waitForTimeout(500)
      const dialog = page.locator('.v-dialog').first()
      if (await dialog.isVisible()) {
        await dialog.screenshot({ path: path.join(outputDir, 'step2_key_dates.png') })
      } else {
        await page.screenshot({ path: path.join(outputDir, 'step2_key_dates.png') })
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // 3. step3_add_absence.png (Multi-stop trip form demonstration)
    await page.goto('/')
    await page.waitForTimeout(400)
    const addAbsenceCard = page.locator('div.v-card').filter({ hasText: /Add.*Absence|Add New Absence|新增離境/i }).first()
    if (await addAbsenceCard.isVisible()) {
      await populateMultiStopForm(addAbsenceCard)
      await addAbsenceCard.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: path.join(outputDir, 'step3_add_absence.png'),
        fullPage: false
      })
    }

    // 4. step3_absence_list.png (Multiple records + Multi-stop trips table)
    const absenceListCard = page.locator('div.v-card').filter({ hasText: /Absence Records|離境紀錄/i }).first()
    if (await absenceListCard.isVisible()) {
      await absenceListCard.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: path.join(outputDir, 'step3_absence_list.png'),
        fullPage: false
      })
    }

    // 5. step4_documents.png
    await page.goto('/documents')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'step4_documents.png'),
      fullPage: false
    })

    // 6. step5_reference.png
    await page.goto('/reference')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'step5_reference.png'),
      fullPage: false
    })

    // 7. step5_profiles.png
    await page.goto('/')
    await page.waitForTimeout(400)
    await page.click('button[title="Navigation Menu"]')
    await page.waitForTimeout(500)
    const chevron = page.locator('button[title="Switch Profile"]').first()
    if (await chevron.isVisible()) {
      await chevron.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({
      path: path.join(outputDir, 'step5_profiles.png'),
      fullPage: false
    })

    // Close drawer
    const overlay = page.locator('.v-overlay--active .v-overlay__scrim').first()
    if (await overlay.isVisible()) {
      await overlay.click()
      await page.waitForTimeout(400)
    }

    // 8. step5_copy_to_profile.png (Demo copying record to another profile)
    await page.goto('/')
    await page.waitForTimeout(400)
    const actionsBtn = page.locator('tbody tr button[title="Actions menu"]').first()
    if (await actionsBtn.isVisible()) {
      await actionsBtn.click()
      await page.waitForTimeout(300)
      const copyMenuItem = page.locator('.v-menu .v-list-item:has-text("Shared With"), .v-menu .v-list-item:has-text("同行成員"), .v-menu .v-list-item:has-text("Share with"), .v-menu .v-list-item:has-text("與其他檔案共享"), .v-menu .v-list-item:has-text("Copy to Profile")').first()
      if (await copyMenuItem.isVisible()) {
        await copyMenuItem.click()
        await page.waitForTimeout(500)
        const copyDialog = page.locator('.v-dialog').first()
        if (await copyDialog.isVisible()) {
          // Select target profiles
          const profileCards = copyDialog.locator('.v-list .v-card')
          if (await profileCards.count() > 0) {
            await profileCards.nth(0).click()
            await page.waitForTimeout(200)
          }
          await copyDialog.screenshot({ path: path.join(outputDir, 'step5_copy_to_profile.png') })
        }
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Mobile Screenshots (390x844)
  // ---------------------------------------------------------------------------
  test('Capture Mobile Screenshots (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedData(page)

    // 1. narrow_step1_overview.png
    await page.goto('/')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'narrow_step1_overview.png'),
      fullPage: false
    })

    // 2. narrow_step2_key_dates.png
    const setDatesBtn = page.locator('button:has-text("Set Key Dates"), button:has-text("Edit Key Dates"), button:has-text("Set Up Key Dates")').first()
    if (await setDatesBtn.isVisible()) {
      await setDatesBtn.click()
      await page.waitForTimeout(500)
      const dialog = page.locator('.v-dialog').first()
      if (await dialog.isVisible()) {
        await dialog.screenshot({ path: path.join(outputDir, 'narrow_step2_key_dates.png') })
      } else {
        await page.screenshot({ path: path.join(outputDir, 'narrow_step2_key_dates.png') })
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // 3. narrow_step3_add_absence.png
    await page.goto('/')
    await page.waitForTimeout(400)
    const addAbsenceCard = page.locator('div.v-card').filter({ hasText: /Add.*Absence|Add New Absence|新增離境/i }).first()
    if (await addAbsenceCard.isVisible()) {
      await populateMultiStopForm(addAbsenceCard)
      await addAbsenceCard.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: path.join(outputDir, 'narrow_step3_add_absence.png'),
        fullPage: false
      })
    }

    // 4. narrow_step3_absence_list.png
    const absenceListCard = page.locator('div.v-card').filter({ hasText: /Absence Records|離境紀錄/i }).first()
    if (await absenceListCard.isVisible()) {
      await absenceListCard.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: path.join(outputDir, 'narrow_step3_absence_list.png'),
        fullPage: false
      })
    }

    // 5. narrow_step4_documents.png
    await page.goto('/documents')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'narrow_step4_documents.png'),
      fullPage: false
    })

    // 6. narrow_step5_reference.png
    await page.goto('/reference')
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outputDir, 'narrow_step5_reference.png'),
      fullPage: false
    })

    // 7. narrow_step5_profiles.png
    await page.goto('/')
    await page.waitForTimeout(400)
    await page.click('button[title="Navigation Menu"]')
    await page.waitForTimeout(500)
    const mobileChevron = page.locator('button[title="Switch Profile"]').first()
    if (await mobileChevron.isVisible()) {
      await mobileChevron.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({
      path: path.join(outputDir, 'narrow_step5_profiles.png'),
      fullPage: false
    })

    // Close drawer
    const mobileOverlay = page.locator('.v-overlay--active .v-overlay__scrim').first()
    if (await mobileOverlay.isVisible()) {
      await mobileOverlay.click()
      await page.waitForTimeout(400)
    }

    // 8. narrow_step5_copy_to_profile.png (Demo copying record to another profile on mobile)
    await page.goto('/')
    await page.waitForTimeout(400)
    const mobileActionsBtn = page.locator('tbody tr button[title="Actions menu"]').first()
    if (await mobileActionsBtn.isVisible()) {
      await mobileActionsBtn.click()
      await page.waitForTimeout(300)
      const mobileCopyMenuItem = page.locator('.v-menu .v-list-item:has-text("Shared With"), .v-menu .v-list-item:has-text("同行成員"), .v-menu .v-list-item:has-text("Share with"), .v-menu .v-list-item:has-text("與其他檔案共享"), .v-menu .v-list-item:has-text("Copy to Profile")').first()
      if (await mobileCopyMenuItem.isVisible()) {
        await mobileCopyMenuItem.click()
        await page.waitForTimeout(500)
        const copyDialog = page.locator('.v-dialog').first()
        if (await copyDialog.isVisible()) {
          // Select target profiles
          const profileCards = copyDialog.locator('.v-list .v-card')
          if (await profileCards.count() > 0) {
            await profileCards.nth(0).click()
            await page.waitForTimeout(200)
          }
          await copyDialog.screenshot({ path: path.join(outputDir, 'narrow_step5_copy_to_profile.png') })
        }
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
  })
})

