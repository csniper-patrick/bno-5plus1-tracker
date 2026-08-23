import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'

import * as dbService from '../src/services/dbService.js'
import * as profileService from '../src/services/profileService.js'
import { useAbsentsStore } from '../src/stores/absents.js'

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

  it('multiple profiles workflow: supports 4 family profiles with isolated data and selective record copying', async () => {
    await profileService.initProfiles()

    // 1. Create family member profiles
    const spouse = await profileService.createProfile('Spouse', '#E91E63')
    const child1 = await profileService.createProfile('Child 1 (Teen)', '#4CAF50')
    const child2 = await profileService.createProfile('Child 2 (Infant)', '#FF9800')

    const metaList = await dbService.getItem(profileService.PROFILES_META_KEY)
    assert.strictEqual(metaList.length, 4)

    // 2. Set independent key dates & address in Child 2 (currently active)
    await dbService.setItem('bno_visa_start_date', '2022-01-10')
    await dbService.setItem('bno_uk_arrival_date', '2022-01-25')
    await dbService.setItem('bno_tracker_documents_v1', {
      addressHistory: [
        { id: 'addr_c2', addressLine1: 'Manchester Flat', postcode: 'M1 1AA', isCurrent: true }
      ]
    })

    // 3. Switch back to Main Applicant
    await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)
    await dbService.setItem('bno_visa_start_date', '2021-06-01')
    await dbService.setItem('bno_uk_arrival_date', '2021-06-15')

    // Main Applicant logs a solo business trip
    const soloTrip = {
      id: 'trip_solo_business',
      startDate: '2022-03-01',
      endDate: '2022-03-05',
      dest: 'Frankfurt, Germany',
      reason: 'Tech Conference',
      stops: [
        { date: '2022-03-01', dest: 'Frankfurt, Germany' },
        { date: '2022-03-05', dest: '' },
      ],
    }
    // Main Applicant logs a family vacation (Main, Spouse, Child 1) - Child 2 stayed home
    const familyVacation = {
      id: 'trip_family_paris_2023',
      startDate: '2023-08-10',
      endDate: '2023-08-20',
      dest: 'Disneyland Paris, France',
      reason: 'Summer Family Holiday',
      stops: [
        { date: '2023-08-10', dest: 'Disneyland Paris, France' },
        { date: '2023-08-20', dest: '' },
      ],
    }

    // Save trips in Main Applicant active absences
    await dbService.setItem('bno_absences', [soloTrip, familyVacation])

    // Copy family vacation ONLY to Spouse and Child 1 (excluding Child 2)
    const copyResult = await profileService.copyAbsenceToProfiles(familyVacation, [
      spouse.id,
      child1.id,
    ])
    assert.strictEqual(copyResult.success, true)
    assert.strictEqual(copyResult.count, 2)

    // Verify inactive profiles data store
    const profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)

    // Spouse has the copied vacation
    assert.strictEqual(profilesData[spouse.id].absences.length, 1)
    assert.strictEqual(profilesData[spouse.id].absences[0].id, 'trip_family_paris_2023')

    // Child 1 has the copied vacation
    assert.strictEqual(profilesData[child1.id].absences.length, 1)
    assert.strictEqual(profilesData[child1.id].absences[0].id, 'trip_family_paris_2023')

    // Child 2 does NOT have the copied vacation and still retains original address/dates
    assert.strictEqual(profilesData[child2.id].absences.length, 0)
    assert.strictEqual(profilesData[child2.id].visaStartDate, '2022-01-10')
    assert.ok(profilesData[child2.id].documents)
    assert.strictEqual(profilesData[child2.id].documents.addressHistory.length, 1)

    // 4. Switch to Spouse profile and verify restored state
    await profileService.switchProfile(spouse.id)
    const spouseActiveAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(spouseActiveAbsences.length, 1)
    assert.strictEqual(spouseActiveAbsences[0].dest, 'Disneyland Paris, France')
    assert.strictEqual(spouseActiveAbsences[0].reason, 'Summer Family Holiday')

    // 5. Switch to Child 2 and verify its isolated state
    await profileService.switchProfile(child2.id)
    const child2ActiveAbsences = await dbService.getItem('bno_absences')
    const child2ActiveVisaStart = await dbService.getItem('bno_visa_start_date')
    assert.strictEqual(child2ActiveAbsences.length, 0)
    assert.strictEqual(child2ActiveVisaStart, '2022-01-10')
  })

  it('copyAbsenceToProfiles handles edge cases gracefully (empty list, invalid ID)', async () => {
    await profileService.initProfiles()

    const testRecord = {
      id: 'test_edge_trip',
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      dest: 'Spain',
    }

    // Empty target array
    const resEmpty = await profileService.copyAbsenceToProfiles(testRecord, [])
    assert.strictEqual(resEmpty.success, true)
    assert.strictEqual(resEmpty.count, 0)

    // Non-existent target profile ID
    const resNonExistent = await profileService.copyAbsenceToProfiles(testRecord, ['non_existent_profile_id_xyz'])
    assert.strictEqual(resNonExistent.success, true)
    assert.strictEqual(resNonExistent.count, 0)
  })

  it('syncUpdatedAbsenceAcrossProfiles updates matching records across other profiles by id to maintain consistency', async () => {
    await profileService.initProfiles()

    // 1. Create multiple profiles: Spouse, Child 1, Child 2
    const spouse = await profileService.createProfile('Spouse')
    const child1 = await profileService.createProfile('Child 1')
    const child2 = await profileService.createProfile('Child 2')

    // Switch back to Main Applicant
    await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)

    // 2. Main Applicant creates a shared trip and copies to Spouse and Child 1 (Child 2 stayed home)
    const initialTrip = {
      id: 'shared_family_trip_777',
      startDate: '2023-08-01',
      endDate: '2023-08-10',
      dest: 'Rome, Italy',
      reason: 'Summer Holiday',
      stops: [
        { date: '2023-08-01', dest: 'Rome, Italy' },
        { date: '2023-08-10', dest: '' },
      ],
    }

    await profileService.copyAbsenceToProfiles(initialTrip, [spouse.id, child1.id])

    // Verify initial copy
    let profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)
    assert.strictEqual(profilesData[spouse.id].absences.length, 1)
    assert.strictEqual(profilesData[spouse.id].absences[0].dest, 'Rome, Italy')
    assert.strictEqual(profilesData[child1.id].absences.length, 1)
    assert.strictEqual(profilesData[child1.id].absences[0].dest, 'Rome, Italy')
    assert.strictEqual(profilesData[child2.id].absences.length, 0)

    // 3. User later modifies the trip in Main Applicant (e.g. extended dates, multi-stop in Rome & Florence)
    const updatedTrip = {
      id: 'shared_family_trip_777',
      startDate: '2023-08-01',
      endDate: '2023-08-18',
      dest: 'Rome ➔ Florence, Italy',
      reason: 'Extended Summer Vacation',
      stops: [
        { date: '2023-08-01', dest: 'Rome' },
        { date: '2023-08-10', dest: 'Florence' },
        { date: '2023-08-18', dest: '' },
      ],
    }

    // Call syncUpdatedAbsenceAcrossProfiles
    const syncRes = await profileService.syncUpdatedAbsenceAcrossProfiles(updatedTrip)
    assert.strictEqual(syncRes.success, true)
    assert.strictEqual(syncRes.updatedCount, 2)
    assert.ok(syncRes.updatedProfiles.includes('Spouse'))
    assert.ok(syncRes.updatedProfiles.includes('Child 1'))

    // 4. Verify inactive profile payloads are updated
    profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)

    const spouseAbsence = profilesData[spouse.id].absences[0]
    assert.strictEqual(spouseAbsence.endDate, '2023-08-18')
    assert.strictEqual(spouseAbsence.dest, 'Rome ➔ Florence, Italy')
    assert.strictEqual(spouseAbsence.reason, 'Extended Summer Vacation')
    assert.strictEqual(spouseAbsence.stops.length, 3)

    const child1Absence = profilesData[child1.id].absences[0]
    assert.strictEqual(child1Absence.endDate, '2023-08-18')
    assert.strictEqual(child1Absence.dest, 'Rome ➔ Florence, Italy')
    assert.strictEqual(child1Absence.stops.length, 3)

    // Child 2 remains empty
    assert.strictEqual(profilesData[child2.id].absences.length, 0)

    // 5. Switch to Spouse profile and verify restored active data is fully up-to-date
    await profileService.switchProfile(spouse.id)
    const spouseActiveAbsences = await dbService.getItem('bno_absences')
    assert.strictEqual(spouseActiveAbsences.length, 1)
    assert.strictEqual(spouseActiveAbsences[0].id, 'shared_family_trip_777')
    assert.strictEqual(spouseActiveAbsences[0].endDate, '2023-08-18')
    assert.strictEqual(spouseActiveAbsences[0].dest, 'Rome ➔ Florence, Italy')
    assert.strictEqual(spouseActiveAbsences[0].reason, 'Extended Summer Vacation')
  })

  it('syncUpdatedAbsenceAcrossProfiles handles edge cases (empty record, non-matching id)', async () => {
    await profileService.initProfiles()

    const resNull = await profileService.syncUpdatedAbsenceAcrossProfiles(null)
    assert.strictEqual(resNull.success, false)
    assert.strictEqual(resNull.updatedCount, 0)

    const resNoId = await profileService.syncUpdatedAbsenceAcrossProfiles({ startDate: '2023-01-01' })
    assert.strictEqual(resNoId.success, false)
    assert.strictEqual(resNoId.updatedCount, 0)

    const resUnmatched = await profileService.syncUpdatedAbsenceAcrossProfiles({
      id: 'completely_unknown_id_xyz',
      startDate: '2023-01-01',
      endDate: '2023-01-10',
    })
    assert.strictEqual(resUnmatched.success, true)
    assert.strictEqual(resUnmatched.updatedCount, 0)
    assert.strictEqual(resUnmatched.updatedProfiles.length, 0)
  })

  it('absentsStore.updateAbsence automatically propagates edits to matching records in other profiles', async () => {
    await profileService.initProfiles()

    // Create Spouse profile
    const spouse = await profileService.createProfile('Spouse')

    // Switch back to Main Applicant
    await profileService.switchProfile(profileService.DEFAULT_PROFILE_ID)

    setActivePinia(createPinia())
    const store = useAbsentsStore()
    await store.initStore()
    store.setVisaStartDate('2021-01-01')

    // Add absence in Main Applicant
    const added = store.addAbsence({
      id: 'vacation_sync_999',
      startDate: '2022-06-01',
      endDate: '2022-06-15',
      dest: 'Japan',
    })

    // Copy to Spouse
    await profileService.copyAbsenceToProfile(added, spouse.id)

    // Now update absence in Main Applicant store
    store.updateAbsence('vacation_sync_999', {
      endDate: '2022-06-25',
      dest: 'Japan & Korea',
    })

    // Wait a brief moment for async sync to settle
    await new Promise((r) => setTimeout(r, 50))

    // Verify Spouse profile in storage has the updated details
    const profilesData = await dbService.getItem(profileService.PROFILES_DATA_KEY)
    assert.strictEqual(profilesData[spouse.id].absences.length, 1)
    assert.strictEqual(profilesData[spouse.id].absences[0].endDate, '2022-06-25')
    assert.strictEqual(profilesData[spouse.id].absences[0].dest, 'Japan & Korea')
  })
})

