<script>
/**
 * Profile Drawer Section Component
 * Compact expandable profile header for the Navigation Drawer.
 * Shows active profile in the main header, expandable section for other profiles,
 * active profile name editing, color picker, duplication, deletion, and profile creation.
 */
import { mapStores } from 'pinia'
import { useProfilesStore } from '../stores/profiles'
import { PROFILE_COLOR_OPTIONS } from '../services/profileService'

export default {
  name: 'ProfileDrawerSection',

  emits: ['show-snackbar'],

  data() {
    return {
      PROFILE_COLOR_OPTIONS,
      isEditing: false,
      editNameInput: '',
      colorMenu: false,
      isExpanded: false,

      showAddForm: false,
      newProfileName: '',
      newProfileColor: PROFILE_COLOR_OPTIONS[0],

      deleteConfirmDialog: false,
      profileToDelete: null,
    }
  },

  computed: {
    ...mapStores(useProfilesStore),

    activeProfile() {
      return this.profilesStore.activeProfile
    },

    profilesList() {
      return this.profilesStore.profilesList
    },

    activeProfileId() {
      return this.profilesStore.activeProfileId
    },

    /** Returns all profiles except the currently active profile */
    otherProfiles() {
      return this.profilesList.filter((p) => p.id !== this.activeProfileId)
    },
  },

  methods: {
    startEditing() {
      this.editNameInput = this.activeProfile.name
      this.isEditing = true
      this.$nextTick(() => {
        if (this.$refs.editNameRef) {
          this.$refs.editNameRef.focus()
        }
      })
    },

    async saveNameEdit() {
      if (!this.isEditing) return
      const trimmed = this.editNameInput.trim()
      if (trimmed && trimmed !== this.activeProfile.name) {
        await this.profilesStore.updateProfile(this.activeProfile.id, { name: trimmed })
        this.$emit('show-snackbar', this.$t('profiles.updated_success'), 'success')
      }
      this.isEditing = false
    },

    cancelNameEdit() {
      this.isEditing = false
    },

    async changeColor(color) {
      await this.profilesStore.updateProfile(this.activeProfile.id, { avatarColor: color })
      this.colorMenu = false
    },

    async handleSwitchProfile(targetId) {
      if (!targetId || targetId === this.activeProfileId) return
      const success = await this.profilesStore.switchProfile(targetId)
      if (success) {
        this.isExpanded = false
        const profile = this.profilesList.find((p) => p.id === targetId)
        const name = profile ? profile.name : ''
        this.$emit('show-snackbar', this.$t('profiles.switched_success', { name }), 'success')
      }
    },

    openAddForm() {
      this.newProfileName = ''
      this.newProfileColor =
        PROFILE_COLOR_OPTIONS[this.profilesList.length % PROFILE_COLOR_OPTIONS.length]
      this.showAddForm = true
    },

    async handleCreateProfile() {
      const name = this.newProfileName.trim()
      if (!name) return

      const created = await this.profilesStore.createProfile(name, this.newProfileColor)
      if (created) {
        this.showAddForm = false
        this.newProfileName = ''
        this.isExpanded = false
        this.$emit(
          'show-snackbar',
          this.$t('profiles.created_success', { name: created.name }),
          'success',
        )
      }
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
  },
}
</script>

<template>
  <div class="px-3 pt-2 pb-2 bg-surface-variant-lighten border-bottom">
    <!-- Active Profile Compact Header Item (Always Visible) -->
    <v-list-item class="px-2 py-1 rounded-lg">
      <template v-slot:prepend>
        <!-- Avatar Badge with Color Picker Menu -->
        <v-menu v-model="colorMenu" :close-on-content-click="false" location="bottom start">
          <template v-slot:activator="{ props }">
            <v-avatar
              v-bind="props"
              size="40"
              :color="activeProfile.avatarColor || '#1976D2'"
              class="cursor-pointer mr-3 shadow-sm text-white font-weight-bold"
              title="Change Profile Color"
            >
              <span class="text-subtitle-1">{{
                (activeProfile.name || 'P').charAt(0).toUpperCase()
              }}</span>
            </v-avatar>
          </template>
          <v-card width="200" class="pa-2">
            <div class="text-caption font-weight-bold mb-2">{{ $t('profiles.avatar_color') }}</div>
            <div class="d-flex flex-wrap gap-1">
              <v-btn
                v-for="color in PROFILE_COLOR_OPTIONS"
                :key="color"
                density="compact"
                icon
                size="small"
                :color="color"
                class="ma-1"
                @click="changeColor(color)"
              >
                <v-icon
                  v-if="color === activeProfile.avatarColor"
                  icon="mdi-check"
                  size="x-small"
                  color="white"
                ></v-icon>
              </v-btn>
            </div>
          </v-card>
        </v-menu>
      </template>

      <!-- Profile Name View or Inline Text Field -->
      <v-list-item-title class="font-weight-bold text-subtitle-1 text-truncate">
        <template v-if="isEditing">
          <v-text-field
            ref="editNameRef"
            v-model="editNameInput"
            density="compact"
            variant="outlined"
            hide-details
            autofocus
            class="text-body-2"
            @keyup.enter="saveNameEdit"
            @keyup.esc="cancelNameEdit"
            @blur="saveNameEdit"
          ></v-text-field>
        </template>
        <template v-else>
          <span class="cursor-pointer" @click="startEditing">{{ activeProfile.name }}</span>
        </template>
      </v-list-item-title>

      <!-- Subtitle -->
      <v-list-item-subtitle class="text-caption text-medium-emphasis">
        {{ $t('profiles.active_profile') }}
      </v-list-item-subtitle>

      <!-- Actions: Rename & Chevron Expand/Collapse -->
      <template v-slot:append>
        <div class="d-flex align-center">
          <v-btn
            v-if="!isEditing"
            icon="mdi-pencil-outline"
            variant="text"
            density="comfortable"
            size="small"
            color="medium-emphasis"
            :title="$t('profiles.edit_profile')"
            @click="startEditing"
          ></v-btn>

          <v-btn
            :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            variant="text"
            density="comfortable"
            size="small"
            color="primary"
            :title="$t('profiles.switch_profile')"
            @click="isExpanded = !isExpanded"
          ></v-btn>
        </div>
      </template>
    </v-list-item>

    <!-- Expandable Profile Switcher & Add Section -->
    <v-expand-transition>
      <div v-if="isExpanded" class="mt-2 pt-2 border-top">
        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2 px-1">
          {{ $t('profiles.switch_profile') }}
        </div>

        <!-- List of Other Profiles (Active profile excluded) -->
        <v-list
          v-if="otherProfiles.length > 0"
          density="compact"
          class="bg-surface rounded-lg border-secondary-lighten pa-1 mb-2"
        >
          <v-list-item
            v-for="profile in otherProfiles"
            :key="profile.id"
            :value="profile.id"
            color="primary"
            rounded="md"
            class="mb-1 cursor-pointer"
            @click="handleSwitchProfile(profile.id)"
          >
            <template v-slot:prepend>
              <v-avatar
                size="24"
                :color="profile.avatarColor || '#1976D2'"
                class="text-white text-caption font-weight-bold mr-2"
              >
                {{ (profile.name || 'P').charAt(0).toUpperCase() }}
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-bold text-caption text-truncate">
              {{ profile.name }}
            </v-list-item-title>

            <template v-slot:append>
              <div class="d-flex align-center gap-1">
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="x-small"
                  color="medium-emphasis"
                  :title="$t('profiles.duplicate_profile')"
                  @click.stop="handleDuplicate(profile.id)"
                ></v-btn>

                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="x-small"
                  color="error"
                  :title="$t('profiles.delete_profile')"
                  @click.stop="confirmDelete(profile)"
                ></v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <!-- In-Drawer Add Profile Action -->
        <template v-if="!showAddForm">
          <v-btn
            variant="tonal"
            color="primary"
            block
            density="compact"
            prepend-icon="mdi-plus-circle-outline"
            class="font-weight-bold text-caption text-none py-1 mb-1"
            @click="openAddForm"
          >
            {{ $t('profiles.add_profile') }}
          </v-btn>
        </template>

        <template v-else>
          <v-card variant="outlined" color="primary" class="pa-2 border-dashed bg-surface mb-1">
            <div class="font-weight-bold text-caption mb-1">
              {{ $t('profiles.add_profile') }}
            </div>
            <v-text-field
              v-model="newProfileName"
              :placeholder="$t('profiles.profile_name_placeholder')"
              density="compact"
              variant="outlined"
              class="mb-2 text-caption"
              hide-details
              autofocus
              @keyup.enter="handleCreateProfile"
              @keyup.esc="showAddForm = false"
            ></v-text-field>

            <!-- Color Palette Selection -->
            <div class="d-flex align-center mb-2">
              <span class="text-caption font-weight-bold mr-1"
                >{{ $t('profiles.avatar_color') }}:</span
              >
              <div class="d-flex gap-1 flex-wrap">
                <v-avatar
                  v-for="color in PROFILE_COLOR_OPTIONS"
                  :key="color"
                  size="18"
                  :color="color"
                  class="cursor-pointer border-1"
                  :class="{ 'elevation-2 border-primary': color === newProfileColor }"
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

            <div class="d-flex justify-end gap-1">
              <v-btn size="x-small" variant="text" @click="showAddForm = false">
                {{ $t('app.clear_dialog_cancel') }}
              </v-btn>
              <v-btn
                size="x-small"
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
    </v-expand-transition>

    <!-- In-Drawer Delete Confirmation Dialog -->
    <v-dialog v-model="deleteConfirmDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="font-weight-bold text-subtitle-1 py-3 px-4 text-error">
          <v-icon icon="mdi-alert-circle-outline" color="error" class="mr-2"></v-icon>
          {{ $t('profiles.delete_confirm_title') }}
        </v-card-title>
        <v-card-text class="px-4 py-2 text-caption">
          {{
            $t('profiles.delete_confirm_body', {
              name: profileToDelete ? profileToDelete.name : '',
            })
          }}
        </v-card-text>
        <v-card-actions class="pa-3 border-top">
          <v-spacer></v-spacer>
          <v-btn size="small" variant="text" @click="deleteConfirmDialog = false">
            {{ $t('app.clear_dialog_cancel') }}
          </v-btn>
          <v-btn size="small" color="error" variant="flat" @click="handleDeleteExecute">
            {{ $t('profiles.delete_profile') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.border-dashed {
  border-style: dashed !important;
}
.shadow-sm {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
</style>
