import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import 'fake-indexeddb/auto'

import * as dbService from '../src/services/dbService.js'
import * as profileService from '../src/services/profileService.js'

describe('Multi-Profile Management & Data Swapping Service', () => {
  beforeEach(async () => {
    dbService.resetDBCache()
    await dbService.clear()
  })

  it('initProfiles creates default "Main Applicant" profile on empty database', async () => {
    const { activeId, metaList } = await profileService.initProfiles()

    assert.strictEqual(activeId, profileService.DEFAULT_PROFILE_ID)
    assert.strictEqual(metaList.length, 1)
    assert.strictEqual(metaList[0].id, profileService.DEFAULT_PROFILE_ID)
    assert.strictEqual(metaList[0].name, 'Main Applicant')
  })

  it('createProfile creates a new profile and switches active profile to it', async () => {
    await profileService.initProfiles()

    const spouseMeta = await profileService.createProfile('Spouse', '#E91E63')

    assert.ok(spouseMeta.id)
    assert.strictEqual(spouseMeta.name, 'Spouse')
    assert.strictEqual(spouseMeta.avatarColor, '#E91E63')

    const activeId = await dbService.getItem(profileService.ACTIVE_PROFILE_KEY)
    assert.strictEqual(activeId, spouseMeta.id)

    const metaList = await dbService.getItem(profileService.PROFILES_META_KEY)
    assert.strictEqual(metaList.length, 2)
  })

  it('switchProfile snapshots current active data and restores target profile data', async () => {
    await profileService.initProfiles()

    // 1. Set active data for Profile 1 (Main Applicant)
    await dbService.setItem('bno_visa_start_date', '2021-01-01')
    await dbService.setItem('bno_absences', [{ id: 'abs_1', startDate: '2022-05-01', endDate: '2022-05-10' }])

    // 2. Create Profile 2 (Spouse) - this automatically switches active profile to Spouse
    const spouseMeta = await profileService.createProfile('Spouse')

    // Active data for Spouse should initially be empty
    const spouseVisaStart = await dbService.getItem('bno_visa_start_date')
    const spouseAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(spouseVisaStart, '')
    assert.deepStrictEqual(spouseAbsences, [])

    // Set active data for Spouse
    await dbService.setItem('bno_visa_start_date', '2021-06-01')
    await dbService.setItem('bno_absences', [{ id: 'abs_spouse_1', startDate: '2023-01-01', endDate: '2023-01-15' }])

    // 3. Switch back to Main Applicant (DEFAULT_PROFILE_ID)
    const switchedBack = await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)
    assert.strictEqual(switchedBack, true)

    // Verify Main Applicant data is restored
    const restoredVisaStart = await dbService.getItem('bno_visa_start_date')
    const restoredAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(restoredVisaStart, '2021-01-01')
    assert.strictEqual(restoredAbsences.length, 1)
    assert.strictEqual(restoredAbsences[0].id, 'abs_1')

    // 4. Switch back to Spouse
    await profileService.switchProfile(spouseMeta.id)
    const restoredSpouseVisaStart = await dbService.getItem('bno_visa_start_date')
    const restoredSpouseAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(restoredSpouseVisaStart, '2021-06-01')
    assert.strictEqual(restoredSpouseAbsences.length, 1)
    assert.strictEqual(restoredSpouseAbsences[0].id, 'abs_spouse_1')
  })

  it('updateProfileMeta renames and updates profile color', async () => {
    await profileService.initProfiles()

    const updatedList = await profileService.updateProfileMeta(profileService.DEFAULT_PROFILE_ID, {
      name: 'Primary Tracker',
      avatarColor: '#2E7D32',
    })

    assert.strictEqual(updatedList[0].name, 'Primary Tracker')
    assert.strictEqual(updatedList[0].avatarColor, '#2E7D32')
  })

  it('duplicateProfile creates a duplicate copy of profile state', async () => {
    await profileService.initProfiles()
    await dbService.setItem('bno_visa_start_date', '2020-10-10')

    const duplicateMeta = await profileService.duplicateProfile(profileService.DEFAULT_PROFILE_ID)

    assert.ok(duplicateMeta)
    assert.strictEqual(duplicateMeta.name, 'Main Applicant (Copy)')

    const duplicatedVisaStart = await dbService.getItem('bno_visa_start_date')
    assert.strictEqual(duplicatedVisaStart, '2020-10-10')
  })

  it('deleteProfile prevents deleting last profile', async () => {
    await profileService.initProfiles()

    const res = await profileService.deleteProfile(profileService.DEFAULT_PROFILE_ID)
    assert.strictEqual(res.success, false)

    const metaList = await dbService.getItem(profileService.PROFILES_META_KEY)
    assert.strictEqual(metaList.length, 1)
  })

  it('deleteProfile automatically switches to remaining profile when active profile is deleted', async () => {
    await profileService.initProfiles()
    const spouseMeta = await profileService.createProfile('Spouse')

    // Currently active is Spouse
    let activeId = await dbService.getItem(profileService.ACTIVE_PROFILE_KEY)
    assert.strictEqual(activeId, spouseMeta.id)

    // Delete active profile (Spouse)
    const res = await profileService.deleteProfile(spouseMeta.id)
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.newActiveId, profileService.DEFAULT_PROFILE_ID)

    activeId = await dbService.getItem(profileService.ACTIVE_PROFILE_KEY)
    assert.strictEqual(activeId, profileService.DEFAULT_PROFILE_ID)

    const metaList = await dbService.getItem(profileService.PROFILES_META_KEY)
    assert.strictEqual(metaList.length, 1)
  })

  it('copyAbsenceToProfile copies absence record preserving its exact id', async () => {
    await profileService.initProfiles()

    // Create a 2nd profile (Spouse)
    const spouseMeta = await profileService.createProfile('Spouse')

    // Switch back to Main Applicant
    await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)

    const testRecord = {
      id: 'custom_absence_id_999',
      startDate: '2023-04-10',
      endDate: '2023-04-20',
      dest: 'Tokyo, Japan',
      stops: [
        { date: '2023-04-10', dest: 'Tokyo, Japan' },
        { date: '2023-04-20', dest: '' },
      ],
      createdAt: '2023-04-01T00:00:00.000Z',
    }

    const res = await profileService.copyAbsenceToProfile(testRecord, spouseMeta.id)
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.count, 1)

    // Verify record in inactive profile storage
    const profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)
    assert.ok(profilesData[spouseMeta.id])
    assert.strictEqual(profilesData[spouseMeta.id].absences.length, 1)

    const copied = profilesData[spouseMeta.id].absences[0]
    assert.strictEqual(copied.id, 'custom_absence_id_999')
    assert.strictEqual(copied.startDate, '2023-04-10')
    assert.strictEqual(copied.endDate, '2023-04-20')
    assert.strictEqual(copied.dest, 'Tokyo, Japan')
    assert.strictEqual(copied.stops.length, 2)

    // Switch to Spouse profile and verify restored active data preserves the id
    await profileService.switchProfile(spouseMeta.id)
    const activeAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(activeAbsences.length, 1)
    assert.strictEqual(activeAbsences[0].id, 'custom_absence_id_999')
    assert.strictEqual(activeAbsences[0].dest, 'Tokyo, Japan')
  })

  it('copyAbsenceToProfiles copies to multiple profiles and updates existing records by id', async () => {
    await profileService.initProfiles()

    const spouseMeta = await profileService.createProfile('Spouse')
    const childMeta = await profileService.createProfile('Child')

    // Switch back to Main Applicant
    await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)

    const testRecord = {
      id: 'family_holiday_id_101',
      startDate: '2023-07-01',
      endDate: '2023-07-15',
      dest: 'Hong Kong',
      stops: [
        { date: '2023-07-01', dest: 'Hong Kong' },
        { date: '2023-07-15', dest: '' },
      ],
    }

    // Copy to both Spouse and Child
    const res = await profileService.copyAbsenceToProfiles(testRecord, [
      spouseMeta.id,
      childMeta.id,
    ])
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.count, 2)

    const profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)
    assert.strictEqual(profilesData[spouseMeta.id].absences.length, 1)
    assert.strictEqual(profilesData[spouseMeta.id].absences[0].id, 'family_holiday_id_101')
    assert.strictEqual(profilesData[childMeta.id].absences.length, 1)
    assert.strictEqual(profilesData[childMeta.id].absences[0].id, 'family_holiday_id_101')

    // Re-copy with updated destination: should update existing record, not duplicate
    const updatedRecord = {
      ...testRecord,
      dest: 'Hong Kong & Macau',
    }

    await profileService.copyAbsenceToProfiles(updatedRecord, [spouseMeta.id])
    const profilesDataAfterUpdate = await dbService.getItem(profileService.PROFILES_DATA_KEY)
    assert.strictEqual(profilesDataAfterUpdate[spouseMeta.id].absences.length, 1)
    assert.strictEqual(profilesDataAfterUpdate[spouseMeta.id].absences[0].id, 'family_holiday_id_101')
    assert.strictEqual(profilesDataAfterUpdate[spouseMeta.id].absences[0].dest, 'Hong Kong & Macau')
  })
})
