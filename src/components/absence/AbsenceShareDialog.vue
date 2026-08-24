<script>
import { mapStores } from 'pinia'
import { useProfilesStore } from '../../stores/profiles'
import { normalizeDate, calculateDays } from '../../utils/date'

export default {
  name: 'AbsenceShareDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    record: {
      type: Object,
      default: null,
    },
    otherProfiles: {
      type: Array,
      default: () => [],
    },
    selectedProfileIds: {
      type: Array,
      default: () => [],
    },
  },

  emits: [
    'update:modelValue',
    'update:selectedProfileIds',
    'save',
    'toggle-select-all',
    'toggle-profile-selection',
  ],

  computed: {
    ...mapStores(useProfilesStore),

    localShow: {
      get() {
        return this.modelValue
      },
      set(val) {
        this.$emit('update:modelValue', val)
      },
    },

    eligibleShareProfiles() {
      if (!this.record || !Array.isArray(this.otherProfiles)) {
        return []
      }
      return this.otherProfiles.filter((p) => this.isProfileShareable(p.id))
    },
  },

  methods: {
    formatDate(dateInput) {
      if (!dateInput) return '-'
      return normalizeDate(dateInput) || String(dateInput)
    },

    calculateDays(start, end) {
      return calculateDays(start, end)
    },

    isProfileShareable(profileId) {
      if (!profileId || !this.record || !this.record.startDate) return false
      const profilePayload = this.profilesStore?.profilesData?.[profileId]
      const visaStartDate = profilePayload?.visaStartDate || ''
      if (!visaStartDate) return false
      if (this.record.startDate < visaStartDate) return false
      const ukArrivalDate = profilePayload?.ukArrivalDate || ''
      if (ukArrivalDate && this.record.startDate < ukArrivalDate) return false
      return true
    },

    getProfileShareDisabledReason(profileId) {
      if (!profileId || !this.record) return ''
      const profilePayload = this.profilesStore?.profilesData?.[profileId]
      const visaStartDate = profilePayload?.visaStartDate || ''
      const ukArrivalDate = profilePayload?.ukArrivalDate || ''
      if (!visaStartDate) {
        return this.$t('absence.share_disabled_no_visa_start')
      }
      if (this.record.startDate && this.record.startDate < visaStartDate) {
        return this.$t('absence.share_disabled_start_before_visa', { date: visaStartDate })
      }
      if (ukArrivalDate && this.record.startDate && this.record.startDate < ukArrivalDate) {
        return this.$t('absence.share_disabled_start_before_arrival', { date: ukArrivalDate })
      }
      return ''
    },

    handleToggleSelectAll() {
      this.$emit('toggle-select-all')
    },

    handleToggleProfile(profileId) {
      this.$emit('toggle-profile-selection', profileId)
    },
  },
}
</script>

<template>
  <!-- Share Record with Other Profiles Dialog -->
  <v-dialog v-model="localShow" max-width="500px">
    <v-card elevation="2" class="rounded-lg pa-3" color="surface">
      <v-card-title class="px-0 pt-0 font-weight-bold text-h6 d-flex align-center ga-2">
        <v-icon icon="mdi-share-variant-outline" color="primary"></v-icon>
        <span>{{ $t('absence.copy_to_profile_title') }}</span>
      </v-card-title>

      <v-card-text class="px-0 py-2">
        <!-- Record Summary Preview Card -->
        <v-card v-if="record" variant="tonal" color="primary" class="pa-3 rounded-lg mb-3">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold">
              <v-icon icon="mdi-airplane-takeoff" size="small" class="mr-1"></v-icon>
              {{ formatDate(record.startDate) }}
              ➔
              <v-icon icon="mdi-airplane-landing" size="small" class="mx-1"></v-icon>
              {{ formatDate(record.endDate) }}
            </span>
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
              {{ calculateDays(record.startDate, record.endDate) }}
              {{ $t('absence.full_days') }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis text-truncate">
            <v-icon icon="mdi-map-marker-outline" size="12" class="mr-1"></v-icon>
            {{ record.dest || $t('absence.unspecified') }}
          </div>
        </v-card>

        <p class="text-caption text-medium-emphasis mb-2">
          {{ $t('absence.copy_to_profile_desc') }}
        </p>

        <!-- Select All / Deselect All Button (if more than 1 other profile) -->
        <div v-if="otherProfiles.length > 1" class="d-flex justify-end mb-2">
          <v-btn
            variant="text"
            density="compact"
            size="x-small"
            color="primary"
            class="font-weight-bold text-none"
            :disabled="eligibleShareProfiles.length === 0"
            @click="handleToggleSelectAll"
          >
            {{
              eligibleShareProfiles.length > 0 &&
              eligibleShareProfiles.every((p) => selectedProfileIds.includes(p.id))
                ? $t('absence.clear_all_profiles')
                : $t('absence.select_all_profiles')
            }}
          </v-btn>
        </div>

        <!-- List of Other Profiles with Checkboxes -->
        <v-list class="pa-0 bg-transparent">
          <v-card
            v-for="profile in otherProfiles"
            :key="profile.id"
            variant="outlined"
            class="mb-2 pa-2 border-secondary-lighten"
            :class="{
              'cursor-pointer': isProfileShareable(profile.id),
              'cursor-not-allowed bg-surface-variant': !isProfileShareable(profile.id),
              'bg-primary-lighten-5 border-primary':
                isProfileShareable(profile.id) && selectedProfileIds.includes(profile.id),
            }"
            :ripple="isProfileShareable(profile.id)"
            @click="handleToggleProfile(profile.id)"
          >
            <div class="d-flex align-center">
              <v-checkbox-btn
                :model-value="selectedProfileIds.includes(profile.id)"
                :disabled="!isProfileShareable(profile.id)"
                density="compact"
                color="primary"
                class="mr-2"
                @click.stop="handleToggleProfile(profile.id)"
              ></v-checkbox-btn>

              <v-avatar
                size="32"
                :color="profile.avatarColor || '#1976D2'"
                class="text-white font-weight-bold mr-3 flex-shrink-0"
              >
                {{ (profile.name || 'P').charAt(0).toUpperCase() }}
              </v-avatar>

              <div class="flex-grow-1 min-w-0">
                <div class="font-weight-bold text-subtitle-2 text-truncate">
                  {{ profile.name }}
                </div>
                <div
                  v-if="!isProfileShareable(profile.id)"
                  class="text-caption text-warning d-flex align-center ga-1 mt-1 text-wrap font-weight-medium"
                >
                  <v-icon
                    icon="mdi-alert-circle-outline"
                    color="warning"
                    size="14"
                    class="flex-shrink-0"
                  ></v-icon>
                  <span>{{ getProfileShareDisabledReason(profile.id) }}</span>
                </div>
                <div
                  v-else-if="profilesStore.profilesData?.[profile.id]?.visaStartDate"
                  class="text-caption text-medium-emphasis mt-0"
                >
                  {{ $t('absence.visa_start') }}:
                  {{ profilesStore.profilesData[profile.id].visaStartDate }}
                </div>
              </div>
            </div>
          </v-card>
        </v-list>
      </v-card-text>

      <v-card-actions class="px-0 pb-0 justify-end ga-2">
        <v-btn variant="text" @click="localShow = false">
          {{ $t('absence.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-share-variant-outline"
          @click="$emit('save')"
        >
          {{ $t('absence.copy_action') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
