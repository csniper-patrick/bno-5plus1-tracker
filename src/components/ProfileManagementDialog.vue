<script>
/**
 * Profile Management Dialog Component
 * Modal dialog for full multi-profile administration:
 * Creating new profiles, editing names & colors, duplicating profiles,
 * and deleting profiles safely.
 */
import { mapStores } from 'pinia'
import { useProfilesStore } from '../stores/profiles'
import { PROFILE_COLOR_OPTIONS } from '../services/profileService'

export default {
  name: 'ProfileManagementDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'show-snackbar'],

  data() {
    return {
      PROFILE_COLOR_OPTIONS,
      showAddCard: false,
      newProfileName: '',
      newProfileColor: PROFILE_COLOR_OPTIONS[0],

      editingId: null,
      editingName: '',

      deleteConfirmDialog: false,
      profileToDelete: null,
    }
  },

  computed: {
    ...mapStores(useProfilesStore),

    dialogVisible: {
      get() {
        return this.modelValue
      },
      set(val) {
        this.$emit('update:modelValue', val)
      },
    },

    profilesList() {
      return this.profilesStore.profilesList
    },

    activeProfileId() {
      return this.profilesStore.activeProfileId
    },
  },

  methods: {
    closeDialog() {
      this.dialogVisible = false
      this.showAddCard = false
      this.editingId = null
    },

    openAddCard() {
      this.newProfileName = ''
      this.newProfileColor =
        PROFILE_COLOR_OPTIONS[this.profilesList.length % PROFILE_COLOR_OPTIONS.length]
      this.showAddCard = true
    },

    async handleCreateProfile() {
      const name = this.newProfileName.trim()
      if (!name) return

      const created = await this.profilesStore.createProfile(name, this.newProfileColor)
      if (created) {
        this.showAddCard = false
        this.newProfileName = ''
        this.$emit(
          'show-snackbar',
          this.$t('profiles.created_success', { name: created.name }),
          'success',
        )
      }
    },

    startEdit(profile) {
      this.editingId = profile.id
      this.editingName = profile.name
    },

    async saveEdit(profileId) {
      const trimmed = this.editingName.trim()
      if (trimmed) {
        await this.profilesStore.updateProfile(profileId, { name: trimmed })
        this.$emit('show-snackbar', this.$t('profiles.updated_success'), 'success')
      }
      this.editingId = null
    },

    async handleDuplicate(profileId) {
      const dup = await this.profilesStore.duplicateProfile(profileId)
      if (dup) {
        this.$emit(
          'show-snackbar',
          this.$t('profiles.created_success', { name: dup.name }),
          'success',
        )
      }
    },

    confirmDelete(profile) {
      if (this.profilesList.length <= 1) {
        this.$emit('show-snackbar', this.$t('profiles.cannot_delete_last'), 'warning')
        return
      }
      this.profileToDelete = profile
      this.deleteConfirmDialog = true
    },

    async handleDeleteExecute() {
      if (!this.profileToDelete) return
      const pId = this.profileToDelete.id
      this.deleteConfirmDialog = false

      const success = await this.profilesStore.deleteProfile(pId)
      if (success) {
        this.$emit('show-snackbar', this.$t('profiles.deleted_success'), 'warning')
      }
      this.profileToDelete = null
    },

    async handleSwitch(profileId) {
      if (profileId === this.activeProfileId) return
      const success = await this.profilesStore.switchProfile(profileId)
      if (success) {
        const profile = this.profilesList.find((p) => p.id === profileId)
        const name = profile ? profile.name : ''
        this.$emit('show-snackbar', this.$t('profiles.switched_success', { name }), 'success')
      }
    },
  },
}
</script>

<template>
  <div>
    <!-- Main Profile Management Dialog -->
    <v-dialog v-model="dialogVisible" max-width="560" scrollable>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center py-3 px-4 border-bottom">
          <v-icon icon="mdi-account-group" color="primary" class="mr-2"></v-icon>
          <span class="font-weight-bold text-h6">{{ $t('profiles.manage_profiles') }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="closeDialog"></v-btn>
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- Add Profile Button / Inline Form -->
          <div class="mb-4">
            <template v-if="!showAddCard">
              <v-btn
                color="primary"
                variant="tonal"
                block
                prepend-icon="mdi-plus-circle-outline"
                class="font-weight-bold py-2"
                @click="openAddCard"
              >
                {{ $t('profiles.add_profile') }}
              </v-btn>
            </template>

            <template v-else>
              <v-card variant="outlined" color="primary" class="pa-3 border-dashed">
                <div class="font-weight-bold text-subtitle-2 mb-2">
                  {{ $t('profiles.add_profile') }}
                </div>
                <v-text-field
                  v-model="newProfileName"
                  :label="$t('profiles.profile_name')"
                  :placeholder="$t('profiles.profile_name_placeholder')"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                  hide-details
                  autofocus
                  @keyup.enter="handleCreateProfile"
                ></v-text-field>

                <!-- Color Selection Row -->
                <div class="d-flex align-center mb-3">
                  <span class="text-caption font-weight-bold mr-2">
                    {{ $t('profiles.avatar_color') }}:
                  </span>
                  <div class="d-flex gap-1 flex-wrap">
                    <v-avatar
                      v-for="color in PROFILE_COLOR_OPTIONS"
                      :key="color"
                      size="24"
                      :color="color"
                      class="cursor-pointer border-2"
                      :class="{ 'elevation-3 border-primary': color === newProfileColor }"
                      @click="newProfileColor = color"
                    >
                      <v-icon
                        v-if="color === newProfileColor"
                        icon="mdi-check"
                        size="x-small"
                        color="white"
                      ></v-icon>
                    </v-avatar>
                  </div>
                </div>

                <div class="d-flex justify-end gap-2">
                  <v-btn size="small" variant="text" @click="showAddCard = false">
                    {{ $t('app.clear_dialog_cancel') }}
                  </v-btn>
                  <v-btn
                    size="small"
                    color="primary"
                    :disabled="!newProfileName.trim()"
                    @click="handleCreateProfile"
                  >
                    {{ $t('profiles.add_profile') }}
                  </v-btn>
                </div>
              </v-card>
            </template>
          </div>

          <!-- List of Existing Profiles -->
          <v-list class="pa-0">
            <v-card
              v-for="profile in profilesList"
              :key="profile.id"
              variant="outlined"
              class="mb-2 pa-2 border-secondary-lighten"
              :class="{ 'bg-primary-lighten-5 border-primary': profile.id === activeProfileId }"
            >
              <div class="d-flex align-center">
                <!-- Avatar Icon -->
                <v-avatar
                  size="36"
                  :color="profile.avatarColor || '#1976D2'"
                  class="text-white font-weight-bold mr-3"
                >
                  {{ (profile.name || 'P').charAt(0).toUpperCase() }}
                </v-avatar>

                <!-- Profile Name Display or Inline Edit -->
                <div class="flex-grow-1 min-w-0 mr-2">
                  <template v-if="editingId === profile.id">
                    <v-text-field
                      v-model="editingName"
                      density="compact"
                      variant="outlined"
                      hide-details
                      autofocus
                      @keyup.enter="saveEdit(profile.id)"
                      @keyup.esc="editingId = null"
                      @blur="saveEdit(profile.id)"
                    ></v-text-field>
                  </template>
                  <template v-else>
                    <div class="font-weight-bold text-subtitle-2 text-truncate">
                      {{ profile.name }}
                      <v-chip
                        v-if="profile.id === activeProfileId"
                        size="x-small"
                        color="primary"
                        class="ml-2 font-weight-bold"
                      >
                        {{ $t('profiles.active') }}
                      </v-chip>
                    </div>
                  </template>
                </div>

                <!-- Action Icon Buttons -->
                <div class="d-flex align-center gap-1">
                  <!-- Switch Profile button (if not active) -->
                  <v-btn
                    v-if="profile.id !== activeProfileId"
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="text-none text-caption font-weight-bold"
                    @click="handleSwitch(profile.id)"
                  >
                    {{ $t('profiles.switch_profile') }}
                  </v-btn>

                  <!-- Edit Name Button -->
                  <v-btn
                    icon="mdi-pencil-outline"
                    variant="text"
                    size="small"
                    color="medium-emphasis"
                    :title="$t('profiles.rename_profile')"
                    @click="startEdit(profile)"
                  ></v-btn>

                  <!-- Duplicate Profile Button -->
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="small"
                    color="medium-emphasis"
                    :title="$t('profiles.duplicate_profile')"
                    @click="handleDuplicate(profile.id)"
                  ></v-btn>

                  <!-- Delete Profile Button -->
                  <v-btn
                    icon="mdi-delete-outline"
                    variant="text"
                    size="small"
                    color="error"
                    :disabled="profilesList.length <= 1"
                    :title="$t('profiles.delete_profile')"
                    @click="confirmDelete(profile)"
                  ></v-btn>
                </div>
              </div>
            </v-card>
          </v-list>
        </v-card-text>

        <v-card-actions class="pa-4 border-top">
          <v-spacer></v-spacer>
          <v-btn variant="tonal" color="secondary" @click="closeDialog">
            {{ $t('app.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Modal -->
    <v-dialog v-model="deleteConfirmDialog" max-width="440">
      <v-card rounded="lg">
        <v-card-title class="font-weight-bold text-h6 py-3 px-4 text-error">
          <v-icon icon="mdi-alert-circle-outline" color="error" class="mr-2"></v-icon>
          {{ $t('profiles.delete_confirm_title') }}
        </v-card-title>
        <v-card-text class="px-4 py-2">
          {{
            $t('profiles.delete_confirm_body', {
              name: profileToDelete ? profileToDelete.name : '',
            })
          }}
        </v-card-text>
        <v-card-actions class="pa-4 border-top">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteConfirmDialog = false">
            {{ $t('app.clear_dialog_cancel') }}
          </v-btn>
          <v-btn color="error" variant="flat" @click="handleDeleteExecute">
            {{ $t('profiles.delete_profile') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.border-dashed {
  border-style: dashed !important;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
