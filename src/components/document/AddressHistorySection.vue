<script>
import { mapStores } from 'pinia'
import { useDocumentsStore } from '../../stores/documents'
import { normalizeDate } from '../../utils/date'

export default {
  name: 'AddressHistorySection',

  emits: ['attach-file', 'view-attached', 'show-snackbar'],

  data() {
    return {
      // Address Form Dialog State
      addressDialog: {
        show: false,
        editingId: null,
        form: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          postcode: '',
          startDate: '',
          endDate: '',
          isCurrent: true,
          housingStatus: 'rented',
          notes: '',
        },
      },

      // Delete Address Confirmation Dialog
      deleteAddressDialog: {
        show: false,
        id: null,
        addressLine1: '',
      },
    }
  },

  computed: {
    ...mapStores(useDocumentsStore),

    addressHistory() {
      return this.documentsStore.addressHistory
    },

    housingStatusOptions() {
      return [
        { title: this.$t('document.housing_rented'), value: 'rented' },
        { title: this.$t('document.housing_owned'), value: 'owned' },
        { title: this.$t('document.housing_with_family'), value: 'with_family' },
        { title: this.$t('document.housing_other'), value: 'other' },
      ]
    },
  },

  methods: {
    formatDate(dateInput) {
      if (!dateInput) return '-'
      return normalizeDate(dateInput) || String(dateInput)
    },

    getAttachedAddressFileCount(addressId) {
      if (!addressId || !Array.isArray(this.documentsStore.uploadedFiles)) return 0
      return this.documentsStore.uploadedFiles.filter((f) => f.linkedAddressId === addressId).length
    },

    openAddAddressDialog() {
      this.addressDialog = {
        show: true,
        editingId: null,
        form: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          postcode: '',
          startDate: '',
          endDate: '',
          isCurrent: this.addressHistory.length === 0,
          housingStatus: 'rented',
          notes: '',
        },
      }
    },

    openEditAddressDialog(item) {
      this.addressDialog = {
        show: true,
        editingId: item.id,
        form: {
          addressLine1: item.addressLine1 || '',
          addressLine2: item.addressLine2 || '',
          city: item.city || '',
          postcode: item.postcode || '',
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          isCurrent: !!item.isCurrent,
          housingStatus: item.housingStatus || 'rented',
          notes: item.notes || '',
        },
      }
    },

    saveAddress() {
      if (!this.addressDialog.form.addressLine1.trim() || !this.addressDialog.form.startDate) {
        this.$emit('show-snackbar', this.$t('document.enter_address_start'), 'error')
        return
      }

      if (this.addressDialog.editingId) {
        this.documentsStore.updateAddress(this.addressDialog.editingId, this.addressDialog.form)
        this.$emit('show-snackbar', this.$t('document.address_updated'), 'success')
      } else {
        this.documentsStore.addAddress(this.addressDialog.form)
        this.$emit('show-snackbar', this.$t('document.address_added'), 'success')
      }

      this.addressDialog.show = false
    },

    openDeleteAddressDialog(item) {
      this.deleteAddressDialog = {
        show: true,
        id: item.id,
        addressLine1: item.addressLine1,
      }
    },

    executeDeleteAddress() {
      if (!this.deleteAddressDialog.id) return
      this.documentsStore.deleteAddress(this.deleteAddressDialog.id)
      this.deleteAddressDialog.show = false
      this.$emit('show-snackbar', this.$t('document.address_deleted'), 'warning')
    },

    openAttachAddressFileDialog(item) {
      this.$emit('attach-file', item)
    },

    openAttachedAddressFilesDialog(item) {
      this.$emit('view-attached', item)
    },
  },
}
</script>

<template>
  <v-col cols="12" lg="6">
    <v-card elevation="2" class="pa-3 rounded-lg bg-surface h-100">
      <v-card-title class="px-0 pt-0 d-flex align-center ga-2">
        <v-icon icon="mdi-home-city-outline" color="primary"></v-icon>
        <span class="text-h5 font-weight-bold">{{ $t('document.address_history') }}</span>
      </v-card-title>

      <v-card-text class="px-0 pb-0">
        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t('document.address_desc') }}
        </p>

        <div v-if="addressHistory.length === 0" class="text-center py-6 text-medium-emphasis">
          <v-icon icon="mdi-map-marker-off-outline" size="large" class="mb-2"></v-icon>
          <div class="text-subtitle-2 font-weight-bold">
            {{ $t('document.no_addresses_title') }}
          </div>
          <div class="text-caption mb-3">
            {{ $t('document.no_addresses_desc') }}
          </div>
        </div>

        <v-table v-else density="comfortable" hover class="border rounded-lg">
          <thead>
            <tr>
              <th class="text-left font-weight-bold">{{ $t('document.move_in_date') }}</th>
              <th class="text-left font-weight-bold">{{ $t('document.move_out_date') }}</th>
              <th class="text-left font-weight-bold" style="min-width: 250px">
                {{ $t('document.address') }}
              </th>
              <th class="text-right font-weight-bold">{{ $t('absence.table_actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in addressHistory" :key="item.id">
              <td class="text-left" style="white-space: nowrap">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-calendar-import"
                  class="font-weight-medium"
                >
                  {{ formatDate(item.startDate) }}
                </v-chip>
              </td>

              <td class="text-left" style="white-space: nowrap">
                <v-chip
                  v-if="item.isCurrent"
                  size="small"
                  variant="flat"
                  color="success"
                  prepend-icon="mdi-home-clock-outline"
                  class="font-weight-bold"
                >
                  {{ $t('document.present') }}
                </v-chip>
                <v-chip
                  v-else
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-calendar-export"
                  class="font-weight-medium"
                >
                  {{ formatDate(item.endDate) }}
                </v-chip>
              </td>

              <td style="min-width: 250px">
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span class="font-weight-medium text-body-2">
                    {{ item.addressLine1 }}{{ item.addressLine2 ? `, ${item.addressLine2}` : '' }}
                  </span>
                  <v-chip
                    v-if="getAttachedAddressFileCount(item.id) > 0"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-paperclip"
                    class="font-weight-bold cursor-pointer"
                    @click="openAttachedAddressFilesDialog(item)"
                  >
                    {{ getAttachedAddressFileCount(item.id) }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.city ? `${item.city}, ` : '' }}{{ item.postcode }}
                </div>
              </td>

              <td class="text-right">
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                      :title="$t('absence.table_actions')"
                    ></v-btn>
                  </template>
                  <v-list density="compact" class="rounded-lg elevation-4">
                    <v-list-item
                      prepend-icon="mdi-paperclip"
                      :title="$t('document.attach_file')"
                      @click="openAttachAddressFileDialog(item)"
                    ></v-list-item>
                    <v-list-item
                      v-if="getAttachedAddressFileCount(item.id) > 0"
                      prepend-icon="mdi-file-eye-outline"
                      :title="$t('document.view_attached')"
                      @click="openAttachedAddressFilesDialog(item)"
                    ></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      :title="$t('document.edit_address')"
                      @click="openEditAddressDialog(item)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      :title="$t('document.delete_address_title')"
                      @click="openDeleteAddressDialog(item)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex justify-end mt-3">
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddAddressDialog">
            {{ $t('document.add_address') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Address Form Dialog -->
    <v-dialog v-model="addressDialog.show" max-width="550px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6">
          {{ addressDialog.editingId ? $t('document.edit_address') : $t('document.add_address') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <v-row density="compact">
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine1"
                :label="$t('document.address_line_1') + ' *'"
                placeholder="e.g. 10 Downing Street"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="addressDialog.form.addressLine2"
                :label="$t('document.address_line_2')"
                placeholder="e.g. Flat 4B"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.city"
                :label="$t('document.city')"
                placeholder="e.g. London"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.postcode"
                :label="$t('document.postcode')"
                placeholder="e.g. SW1A 2AA"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.startDate"
                :label="$t('document.move_in_date') + ' *'"
                type="date"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="addressDialog.form.endDate"
                :label="$t('document.move_out_date')"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="addressDialog.form.isCurrent"
                class="mb-1"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="addressDialog.form.isCurrent"
                :label="$t('document.is_current')"
                color="primary"
                density="compact"
                hide-details
                class="mb-2"
              ></v-checkbox>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="addressDialog.form.housingStatus"
                :items="housingStatusOptions"
                :label="$t('document.housing_status')"
                variant="outlined"
                density="compact"
                class="mb-1"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="addressDialog.form.notes"
                :label="$t('document.notes')"
                placeholder="e.g. Tenancy reference, landlord contact details..."
                variant="outlined"
                density="compact"
                rows="2"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="addressDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="primary" variant="flat" @click="saveAddress">{{
            $t('document.save')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Address Confirmation Dialog -->
    <v-dialog v-model="deleteAddressDialog.show" max-width="400px">
      <v-card elevation="2" class="rounded-lg pa-3" color="surface">
        <v-card-title class="px-0 pt-0 font-weight-bold text-h6 text-error">
          {{ $t('document.delete_address_title') }}
        </v-card-title>
        <v-card-text class="px-0 py-2">
          {{ $t('document.delete_address_body', { address: deleteAddressDialog.addressLine1 }) }}
        </v-card-text>
        <v-card-actions class="px-0 pb-0 justify-end ga-2">
          <v-btn variant="text" @click="deleteAddressDialog.show = false">{{
            $t('absence.cancel')
          }}</v-btn>
          <v-btn color="error" variant="flat" @click="executeDeleteAddress">{{
            $t('absence.delete_confirm')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-col>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
