<script>
import { mapStores } from 'pinia'
import { useAbsentsStore } from '../../stores/absents'
import { useProfilesStore } from '../../stores/profiles'
import { normalizeDate, calculateDays } from '../../utils/date'

export default {
  name: 'AbsenceRecordsTable',

  props: {
    displayAbsences: {
      type: Array,
      required: true,
    },
    editingId: {
      type: [String, Number, null],
      default: null,
    },
    timelineViewMode: {
      type: String,
      default: 'compact',
    },
    tableSortBy: {
      type: String,
      default: 'startDate',
    },
    tableSortOrder: {
      type: String,
      default: 'asc',
    },
    hasMultipleProfiles: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['sort', 'update:timelineViewMode', 'edit', 'share', 'delete'],

  computed: {
    ...mapStores(useAbsentsStore, useProfilesStore),

    localTimelineViewMode: {
      get() {
        return this.timelineViewMode
      },
      set(val) {
        this.$emit('update:timelineViewMode', val)
      },
    },
  },

  methods: {
    calculateDays(start, end) {
      return calculateDays(start, end)
    },

    formatDate(dateInput) {
      if (!dateInput) return '-'
      return normalizeDate(dateInput) || String(dateInput)
    },

    getTodayStr() {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    isFutureEvent(item) {
      if (!item || !item.endDate) return false
      return item.endDate > this.getTodayStr()
    },

    isOngoingEvent(item) {
      if (!item || !item.startDate || !item.endDate) return false
      const today = this.getTodayStr()
      return item.startDate <= today && item.endDate >= today
    },

    getRecordStops(item) {
      if (Array.isArray(item.stops) && item.stops.length >= 2) {
        return item.stops
      }
      return [
        { date: item.startDate, dest: item.dest || '' },
        { date: item.endDate, dest: '' },
      ]
    },

    getSharedProfiles(item) {
      if (!item || !item.id || item.isAutoArrival || item.id === 'auto_uk_arrival_record') {
        return []
      }
      if (typeof this.profilesStore?.getProfilesSharingAbsence === 'function') {
        return this.profilesStore.getProfilesSharingAbsence(item.id)
      }
      return []
    },

    sortByColumn(field) {
      this.$emit('sort', field)
    },
  },
}
</script>

<template>
  <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
    <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
      <v-icon icon="mdi-format-list-bulleted" color="primary"></v-icon>
      <span class="text-h5 font-weight-bold">{{ $t('absence.records_title') }}</span>
      <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
        {{ absentsStore.sortedAbsences.length }}
      </v-chip>
    </v-card-title>

    <v-card-text class="px-0 pb-0">
      <!-- Records Table -->
      <v-table
        v-if="displayAbsences.length > 0"
        density="comfortable"
        hover
        class="border rounded-lg"
      >
        <thead>
          <tr>
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
              style="min-width: 90px; width: 100px; white-space: nowrap"
              @click="sortByColumn('status')"
            >
              <div class="d-flex align-center ga-1 text-no-wrap">
                <span>{{ $t('absence.table_status') }}</span>
                <v-icon
                  v-if="tableSortBy === 'status'"
                  :icon="tableSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              class="text-left font-weight-bold cursor-pointer user-select-none text-no-wrap"
              style="min-width: 160px; white-space: nowrap"
              @click="sortByColumn('startDate')"
            >
              <div class="d-flex align-center ga-1 text-no-wrap">
                <span>{{ $t('absence.trip_timeline') }}</span>
                <v-icon
                  v-if="tableSortBy === 'startDate'"
                  :icon="tableSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              class="text-center font-weight-bold cursor-pointer user-select-none text-no-wrap"
              style="min-width: 120px; width: 130px; white-space: nowrap"
              @click="sortByColumn('days')"
            >
              <div class="d-flex align-center justify-center ga-1 text-no-wrap">
                <span>{{ $t('absence.full_days') }}</span>
                <v-icon
                  v-if="tableSortBy === 'days'"
                  :icon="tableSortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                  size="x-small"
                  color="primary"
                ></v-icon>
              </div>
            </th>
            <th
              v-if="timelineViewMode === 'full' && hasMultipleProfiles"
              class="text-center font-weight-bold user-select-none text-no-wrap"
              style="min-width: 100px; width: 120px; white-space: nowrap"
            >
              <span class="text-no-wrap">{{ $t('absence.shared_with') }}</span>
            </th>
            <th
              class="text-right font-weight-bold text-no-wrap"
              style="min-width: 90px; width: 100px; white-space: nowrap"
            >
              {{ $t('absence.table_actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in displayAbsences"
            :key="item.id"
            :class="{
              'bg-action-hover': editingId === item.id,
              'row-planned-event':
                isFutureEvent(item) && !isOngoingEvent(item) && editingId !== item.id,
              'row-ongoing-event': isOngoingEvent(item) && editingId !== item.id,
            }"
          >
            <td class="align-middle" style="width: 100px">
              <!-- Event Status Chip -->
              <v-chip
                v-if="item.isAutoArrival"
                size="x-small"
                color="secondary"
                variant="flat"
                class="font-weight-bold"
              >
                {{ $t('absence.initial') }}
              </v-chip>
              <v-chip
                v-else-if="isOngoingEvent(item)"
                size="x-small"
                color="warning"
                variant="flat"
                class="font-weight-bold"
              >
                {{ $t('absence.ongoing') }}
              </v-chip>
              <v-chip
                v-else-if="isFutureEvent(item)"
                size="x-small"
                color="info"
                variant="outlined"
                class="font-weight-medium"
              >
                {{ $t('absence.planned') }}
              </v-chip>
              <v-chip
                v-else
                size="x-small"
                color="grey"
                variant="tonal"
                class="font-weight-regular text-caption"
              >
                {{ $t('absence.past') }}
              </v-chip>
            </td>

            <td class="py-3 align-middle">
              <!-- FULL Mode Timeline -->
              <div
                v-if="timelineViewMode === 'full'"
                class="d-flex align-center flex-nowrap ga-1 overflow-x-auto py-1 w-100"
              >
                <template v-for="(stop, idx) in getRecordStops(item)" :key="idx">
                  <!-- List NODE -->
                  <div
                    class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0"
                  >
                    <v-icon
                      :icon="
                        idx === 0
                          ? 'mdi-airplane-takeoff'
                          : idx === getRecordStops(item).length - 1
                            ? 'mdi-airplane-landing'
                            : 'mdi-map-marker'
                      "
                      :color="
                        idx === 0
                          ? 'primary'
                          : idx === getRecordStops(item).length - 1
                            ? 'success'
                            : 'info'
                      "
                      size="x-small"
                    ></v-icon>
                    <span class="text-caption font-weight-bold text-no-wrap">
                      {{ formatDate(stop.date) }}
                    </span>
                  </div>

                  <!-- List EDGE Connector -->
                  <div
                    v-if="idx < getRecordStops(item).length - 1"
                    class="d-flex align-center justify-center ga-1 px-1 flex-grow-1"
                    style="min-width: 50px"
                  >
                    <div class="edge-line flex-grow-1"></div>
                    <v-chip
                      v-if="stop.dest"
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="font-weight-medium text-no-wrap"
                    >
                      <v-icon start icon="mdi-map-marker-outline" size="10"></v-icon>
                      {{ stop.dest }}
                    </v-chip>
                    <div class="edge-line flex-grow-1"></div>
                    <v-icon icon="mdi-chevron-right" size="x-small" color="primary"></v-icon>
                  </div>
                </template>
              </div>

              <!-- COMPACT Mode Timeline -->
              <div v-else class="d-flex align-center flex-nowrap ga-1 overflow-x-auto py-1 w-100">
                <!-- Departure Node -->
                <div
                  class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0"
                >
                  <v-icon icon="mdi-airplane-takeoff" color="primary" size="x-small"></v-icon>
                  <span class="text-caption font-weight-bold text-no-wrap">
                    {{ formatDate(item.startDate) }}
                  </span>
                </div>

                <!-- Summary Edge -->
                <div
                  class="d-flex align-center justify-center ga-1 px-1 flex-grow-1"
                  style="min-width: 60px"
                >
                  <div class="edge-line flex-grow-1"></div>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="font-weight-medium text-no-wrap"
                  >
                    <v-icon start icon="mdi-map-marker-outline" size="10"></v-icon>
                    {{ item.dest || $t('absence.unspecified') }}
                  </v-chip>
                  <div class="edge-line flex-grow-1"></div>
                  <v-icon icon="mdi-chevron-right" size="x-small" color="primary"></v-icon>
                </div>

                <!-- Return Node -->
                <div
                  class="d-flex align-center ga-1 bg-surface-variant px-2 py-1 rounded border flex-shrink-0"
                >
                  <v-icon icon="mdi-airplane-landing" color="success" size="x-small"></v-icon>
                  <span class="text-caption font-weight-bold text-no-wrap">
                    {{ formatDate(item.endDate) }}
                  </span>
                </div>
              </div>
            </td>
            <td class="text-center align-middle">
              <v-chip
                :color="
                  isOngoingEvent(item)
                    ? 'warning'
                    : isFutureEvent(item)
                      ? 'info'
                      : calculateDays(item.startDate, item.endDate) > 0
                        ? 'primary'
                        : 'grey'
                "
                size="x-small"
                :variant="isFutureEvent(item) && !isOngoingEvent(item) ? 'outlined' : 'tonal'"
                :class="{
                  'font-weight-bold': !isFutureEvent(item) || isOngoingEvent(item),
                  'font-weight-medium opacity-90': isFutureEvent(item) && !isOngoingEvent(item),
                }"
              >
                {{ calculateDays(item.startDate, item.endDate) }} day(s)
              </v-chip>
            </td>
            <td
              v-if="timelineViewMode === 'full' && hasMultipleProfiles"
              class="text-center align-middle"
              style="width: 120px"
            >
              <template v-if="item.isAutoArrival || item.id === 'auto_uk_arrival_record'">
                <span class="text-caption text-medium-emphasis">—</span>
              </template>
              <template v-else>
                <div
                  v-if="getSharedProfiles(item).length > 0"
                  class="d-flex align-center justify-center ga-1 flex-wrap"
                >
                  <v-tooltip
                    v-for="profile in getSharedProfiles(item)"
                    :key="profile.id"
                    :text="profile.name"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-avatar
                        v-bind="props"
                        size="24"
                        :color="profile.avatarColor || '#1976D2'"
                        class="text-white font-weight-bold elevation-1 cursor-pointer"
                      >
                        <span style="font-size: 10px">{{
                          (profile.name || 'P').charAt(0).toUpperCase()
                        }}</span>
                      </v-avatar>
                    </template>
                  </v-tooltip>
                </div>
                <span v-else class="text-caption text-medium-emphasis">—</span>
              </template>
            </td>
            <td class="text-right align-middle">
              <template v-if="item.isAutoArrival || item.id === 'auto_uk_arrival_record'">
                <v-chip
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-lock-outline"
                  title="Initial UK Entry record is managed via Key Dates"
                  class="font-weight-medium"
                >
                  {{ $t('absence.managed') }}
                </v-chip>
              </template>
              <template v-else>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                      title="Actions menu"
                    ></v-btn>
                  </template>
                  <v-list density="compact" class="rounded-lg elevation-4">
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      :title="$t('absence.edit_record_title')"
                      @click="$emit('edit', item)"
                    ></v-list-item>
                    <v-list-item
                      v-if="hasMultipleProfiles"
                      prepend-icon="mdi-share-variant-outline"
                      :title="$t('absence.copy_to_profile')"
                      @click="$emit('share', item)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      :title="$t('absence.delete_record_title')"
                      @click="$emit('delete', item)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </template>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Empty State -->
      <div v-else class="pa-6 text-center">
        <v-avatar color="surface-variant" size="56" class="mb-2">
          <v-icon icon="mdi-airplane-off" size="28" color="medium-emphasis"></v-icon>
        </v-avatar>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          {{ $t('absence.no_records_title') }}
        </h3>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ $t('absence.no_records_desc') }}
        </p>
      </div>

      <!-- Card Bottom Actions: View Mode Toggle -->
      <div
        v-if="absentsStore.sortedAbsences.length > 0"
        class="d-flex align-center justify-end mt-3"
      >
        <v-btn-toggle
          v-model="localTimelineViewMode"
          mandatory
          density="compact"
          size="x-small"
          color="primary"
          variant="outlined"
          class="rounded-lg"
        >
          <v-btn value="full" prepend-icon="mdi-timeline-text-outline">
            {{ $t('absence.view_full') }}
          </v-btn>
          <v-btn value="compact" prepend-icon="mdi-view-compact-outline">
            {{ $t('absence.view_compact') }}
          </v-btn>
        </v-btn-toggle>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.bg-action-hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
.row-planned-event {
  background-color: rgba(var(--v-theme-info), 0.05);
  opacity: 0.85;
}
.row-ongoing-event {
  background-color: rgba(var(--v-theme-warning), 0.06);
}
.edge-line {
  width: 14px;
  height: 5px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
}
.cursor-pointer {
  cursor: pointer;
}
.user-select-none {
  user-select: none;
}
.v-table thead th {
  white-space: nowrap !important;
  word-break: keep-all !important;
}
</style>
