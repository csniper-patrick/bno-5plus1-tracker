<script>
export default {
  name: 'AbsenceFormCard',

  props: {
    form: {
      type: Object,
      required: true,
    },
    editingId: {
      type: [String, Number, null],
      default: null,
    },
    startDateError: {
      type: String,
      default: '',
    },
    endDateError: {
      type: String,
      default: '',
    },
    nodeDateError: {
      type: String,
      default: '',
    },
    dateRangeError: {
      type: String,
      default: '',
    },
    calculatedDaysForForm: {
      type: Number,
      default: 0,
    },
    isFormValid: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
  },

  emits: ['save', 'cancel-edit', 'add-stop', 'remove-stop'],
}
</script>

<template>
  <v-card ref="editorCard" elevation="2" class="pa-3 rounded-lg bg-surface">
    <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
      <v-icon :icon="editingId ? 'mdi-pencil' : 'mdi-plus-circle'" color="primary"></v-icon>
      <span class="text-h5 font-weight-bold">
        {{ editingId ? $t('absence.edit_record') : $t('absence.add_record') }}
      </span>
    </v-card-title>

    <v-card-text class="px-0 pb-0">
      <v-form @submit.prevent="$emit('save')">
        <!-- Responsive Graph Timeline Flow for Multi-Stop Trip Editor -->
        <div class="editor-timeline-container mb-3 w-100">
          <div class="editor-timeline-flow py-2 px-1 w-100">
            <template v-for="(stop, index) in form.stops" :key="index">
              <!-- NODE Item (Date) -->
              <div class="timeline-node-item d-flex align-stretch">
                <!-- Vertical timeline left indicator -->
                <div class="timeline-indicator-left flex-column align-center justify-start pt-1">
                  <div
                    class="node-icon-bubble rounded-circle d-flex align-center justify-center elevation-1"
                    :class="
                      index === 0
                        ? 'bg-primary'
                        : index === form.stops.length - 1
                          ? 'bg-success'
                          : 'bg-info'
                    "
                    style="width: 28px; height: 28px"
                  >
                    <v-icon
                      :icon="
                        index === 0
                          ? 'mdi-airplane-takeoff'
                          : index === form.stops.length - 1
                            ? 'mdi-airplane-landing'
                            : 'mdi-map-marker'
                      "
                      color="white"
                      size="x-small"
                    ></v-icon>
                  </div>
                </div>

                <!-- Node Right Content (Inputs & Header) -->
                <div class="timeline-node-content flex-grow-1">
                  <div class="d-flex align-center justify-space-between ga-2 mb-2">
                    <span
                      class="text-caption font-weight-bold text-primary d-flex align-center ga-1"
                    >
                      <v-icon
                        class="desktop-node-icon"
                        :icon="
                          index === 0
                            ? 'mdi-airplane-takeoff'
                            : index === form.stops.length - 1
                              ? 'mdi-airplane-landing'
                              : 'mdi-map-marker'
                        "
                        :color="
                          index === 0
                            ? 'primary'
                            : index === form.stops.length - 1
                              ? 'success'
                              : 'info'
                        "
                        size="x-small"
                      ></v-icon>
                      <span>
                        {{
                          index === 0
                            ? $t('absence.dep_uk')
                            : index === form.stops.length - 1
                              ? $t('absence.ret_uk')
                              : $t('absence.stop_number', { n: index })
                        }}
                      </span>
                    </span>

                    <v-btn
                      v-if="index > 0 && index < form.stops.length - 1"
                      icon="mdi-close"
                      variant="text"
                      color="error"
                      size="x-small"
                      :title="$t('absence.remove_stop')"
                      @click="$emit('remove-stop', index)"
                    ></v-btn>
                  </div>

                  <!-- Date Input (Node) -->
                  <v-text-field
                    v-model="stop.date"
                    type="date"
                    :label="
                      index === 0
                        ? $t('absence.departure_date')
                        : index === form.stops.length - 1
                          ? $t('absence.return_date')
                          : $t('absence.stop_date')
                    "
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    :error-messages="
                      index === 0
                        ? startDateError
                        : index === form.stops.length - 1
                          ? endDateError
                          : ''
                    "
                    class="w-100"
                    required
                  ></v-text-field>
                </div>
              </div>

              <!-- EDGE Item (Destination to Next Node) -->
              <div
                v-if="index < form.stops.length - 1"
                class="timeline-edge-item d-flex align-stretch"
              >
                <!-- Vertical timeline connector left indicator -->
                <div class="timeline-indicator-left flex-column align-center justify-center my-1">
                  <div class="vertical-line-flex"></div>
                  <v-icon
                    icon="mdi-chevron-down"
                    size="small"
                    color="primary"
                    class="my-1"
                  ></v-icon>
                  <div class="vertical-line-flex"></div>
                </div>

                <!-- Edge Right Content (Destination Input) -->
                <div
                  class="timeline-edge-content flex-grow-1 px-0 py-1 d-flex flex-column justify-center"
                >
                  <div
                    class="text-caption font-weight-medium text-medium-emphasis mb-1 d-flex align-center ga-1"
                  >
                    <v-icon icon="mdi-map-marker-outline" size="12"></v-icon>
                    <span>{{ $t('absence.leg_dest') }}</span>
                  </div>

                  <v-text-field
                    v-model="stop.dest"
                    placeholder="e.g. Hong Kong, Japan"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="w-100"
                  ></v-text-field>

                  <!-- Horizontal Arrow for Desktop -->
                  <div
                    class="edge-line-arrow desktop-edge-arrow d-flex align-center justify-center w-100 mt-2"
                  >
                    <div class="line-flex"></div>
                    <v-icon icon="mdi-chevron-right" size="small" color="primary"></v-icon>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Node date error -->
        <div v-if="nodeDateError" class="mb-2">
          <span class="text-caption text-error">
            {{ nodeDateError }}
          </span>
        </div>

        <!-- Calculated Full Days Chip -->
        <div v-if="startDate && endDate && !dateRangeError" class="mt-4">
          <v-chip
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-calculator"
            size="small"
            class="font-weight-medium"
          >
            <i18n-t keypath="absence.calculated_full_days" scope="global">
              <template #days>
                <strong class="ml-1 text-primary">{{ calculatedDaysForForm }}</strong>
              </template>
            </i18n-t>
          </v-chip>
        </div>

        <!-- Form Actions -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-4 mt-4">
          <v-btn variant="tonal" color="info" prepend-icon="mdi-plus" @click="$emit('add-stop')">
            {{ $t('absence.add_stop') }}
          </v-btn>

          <div class="d-flex align-center ga-2">
            <v-btn
              v-if="editingId"
              variant="outlined"
              color="secondary"
              prepend-icon="mdi-close"
              @click="$emit('cancel-edit')"
            >
              {{ $t('absence.cancel') }}
            </v-btn>

            <v-btn
              type="submit"
              color="primary"
              :disabled="!isFormValid"
              :prepend-icon="editingId ? 'mdi-check' : 'mdi-plus'"
            >
              {{ editingId ? $t('absence.update_record') : $t('absence.add_record') }}
            </v-btn>
          </div>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.editor-timeline-flow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}
.timeline-node-item,
.timeline-edge-item {
  flex: none;
  width: 100%;
  min-width: 0;
}
.timeline-indicator-left {
  display: flex;
  width: 32px;
  min-width: 32px;
  margin-right: 12px;
}
.desktop-node-icon,
.desktop-edge-arrow {
  display: none;
}
.vertical-line-flex {
  width: 5px;
  min-height: 12px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
  flex-grow: 1;
}
.line-flex {
  flex-grow: 1;
  height: 5px;
  background-color: rgba(var(--v-theme-primary), 0.55);
  border-radius: 3px;
}
</style>
