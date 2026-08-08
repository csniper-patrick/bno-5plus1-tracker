<template>
  <div class="pdf-viewer d-flex flex-column h-100 bg-grey-darken-4 text-white position-relative">
    <!-- Navigation & Zoom Toolbar -->
    <div
      class="pdf-toolbar d-flex align-center justify-space-between flex-wrap ga-2 px-3 py-2 bg-grey-darken-3 border-b text-body-2 shadow-2"
      style="z-index: 5"
    >
      <!-- Page Controls -->
      <div class="d-flex align-center ga-1">
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :disabled="currentPage <= 1 || loading"
          :title="$t('document.pdf_prev_page')"
          @click="prevPage"
        ></v-btn>

        <span v-if="totalPages > 0" class="text-caption font-weight-medium px-2">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <span v-else class="text-caption text-medium-emphasis px-2">-- / --</span>

        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :disabled="currentPage >= totalPages || loading"
          :title="$t('document.pdf_next_page')"
          @click="nextPage"
        ></v-btn>
      </div>

      <!-- Zoom & View Controls -->
      <div class="d-flex align-center ga-1">
        <v-btn
          icon="mdi-magnify-minus-outline"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :disabled="scale <= 0.4 || loading"
          :title="$t('document.pdf_zoom_out')"
          @click="zoomOut"
        ></v-btn>

        <v-btn
          variant="tonal"
          density="compact"
          size="small"
          color="white"
          class="text-caption font-weight-bold px-2 text-none"
          :disabled="loading"
          :title="$t('document.pdf_fit_width')"
          @click="fitToWidth"
        >
          {{ Math.round(scale * 100) }}%
        </v-btn>

        <v-btn
          icon="mdi-magnify-plus-outline"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :disabled="scale >= 3.0 || loading"
          :title="$t('document.pdf_zoom_in')"
          @click="zoomIn"
        ></v-btn>

        <v-btn
          icon="mdi-rotate-right"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :disabled="loading"
          :title="$t('document.pdf_rotate')"
          @click="rotateRight"
        ></v-btn>

        <v-btn
          v-if="fileUrl"
          icon="mdi-open-in-new"
          variant="text"
          density="comfortable"
          size="small"
          color="white"
          :title="$t('document.open_new_tab')"
          @click="openExternal"
        ></v-btn>
      </div>
    </div>

    <!-- Viewport Container -->
    <div
      ref="container"
      class="pdf-viewport flex-grow-1 overflow-auto d-flex flex-column align-center justify-start pa-3"
      style="min-height: 300px; width: 100%; position: relative"
    >
      <!-- Loading State -->
      <div
        v-if="loading"
        class="d-flex flex-column align-center justify-center py-12 ga-3 text-white my-auto"
      >
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
        <span class="text-caption text-medium-emphasis">{{ $t('document.loading_pdf') }}</span>
      </div>

      <!-- Error Fallback -->
      <div v-else-if="error" class="pa-8 text-center text-white my-auto">
        <v-icon icon="mdi-file-alert-outline" size="56" color="warning" class="mb-3"></v-icon>
        <div class="text-subtitle-1 font-weight-bold mb-1">
          {{ $t('document.pdf_render_error') }}
        </div>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ error }}
        </div>
        <div class="d-flex ga-2 justify-center flex-wrap">
          <v-btn
            v-if="fileUrl"
            color="primary"
            prepend-icon="mdi-open-in-new"
            variant="elevated"
            size="small"
            @click="openExternal"
          >
            {{ $t('document.open_new_tab') }}
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-download"
            variant="tonal"
            size="small"
            @click="$emit('download')"
          >
            {{ $t('document.file_download') }}
          </v-btn>
        </div>
      </div>

      <!-- Canvas Display -->
      <div
        v-show="!loading && !error && totalPages > 0"
        class="pdf-canvas-card elevation-6 bg-white rounded mb-4 position-relative"
        style="max-width: 100%"
      >
        <canvas ref="pdfCanvas" class="d-block mx-auto"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PdfViewer',
  props: {
    /** Raw PDF file ArrayBuffer or Uint8Array */
    fileData: {
      type: [ArrayBuffer, Uint8Array],
      default: null,
    },
    /** Object URL fallback */
    fileUrl: {
      type: String,
      default: null,
    },
    /** Display filename */
    fileName: {
      type: String,
      default: 'document.pdf',
    },
  },
  emits: ['download'],
  data() {
    return {
      pdfDoc: null,
      loading: true,
      error: null,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      rotation: 0,
      rendering: false,
      pendingPageNum: null,
      currentRenderTask: null,
    }
  },
  watch: {
    fileData: {
      immediate: true,
      handler(newData) {
        if (newData) this.loadPdf()
      },
    },
    fileUrl: {
      immediate: true,
      handler(newUrl) {
        if (newUrl && !this.fileData) this.loadPdf()
      },
    },
    currentPage(newNum) {
      this.queueRenderPage(newNum)
    },
    scale() {
      this.queueRenderPage(this.currentPage)
    },
    rotation() {
      this.queueRenderPage(this.currentPage)
    },
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    this.destroyPdf()
  },
  methods: {
    async loadPdf() {
      if (typeof window === 'undefined') return

      this.loading = true
      this.error = null
      this.destroyPdf()

      try {
        const pdfjsLib = await import('pdfjs-dist')
        const pdfWorkerModule = await import('pdfjs-dist/build/pdf.worker.mjs?url')
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default

        let loadingTask = null
        if (this.fileData) {
          const dataArray = this.fileData instanceof Uint8Array
            ? this.fileData
            : new Uint8Array(this.fileData)
          loadingTask = pdfjsLib.getDocument({ data: dataArray })
        } else if (this.fileUrl) {
          loadingTask = pdfjsLib.getDocument(this.fileUrl)
        } else {
          throw new Error('No file data provided')
        }

        this.pdfDoc = await loadingTask.promise
        this.totalPages = this.pdfDoc.numPages
        this.currentPage = 1
        this.loading = false

        await this.$nextTick()
        await this.fitToWidth()
        this.renderPage(this.currentPage)
      } catch (err) {
        console.error('PdfViewer loadPdf error:', err)
        this.error = err.message || 'Failed to parse PDF document'
        this.loading = false
      }
    },

    destroyPdf() {
      if (this.currentRenderTask) {
        try {
          this.currentRenderTask.cancel()
        } catch (e) {
          // ignore
        }
        this.currentRenderTask = null
      }
      if (this.pdfDoc) {
        try {
          this.pdfDoc.destroy()
        } catch (e) {
          // ignore
        }
        this.pdfDoc = null
      }
    },

    async fitToWidth() {
      if (!this.pdfDoc || !this.$refs.container) return
      try {
        const page = await this.pdfDoc.getPage(this.currentPage)
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation: this.rotation })
        const containerWidth = this.$refs.container.clientWidth - 32 // Account for padding
        if (containerWidth > 0 && unscaledViewport.width > 0) {
          const calculatedScale = containerWidth / unscaledViewport.width
          this.scale = Math.min(Math.max(+calculatedScale.toFixed(2), 0.4), 2.5)
        } else {
          this.scale = 1.0
        }
      } catch (e) {
        this.scale = 1.0
      }
    },

    prevPage() {
      if (this.currentPage > 1) this.currentPage--
    },

    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++
    },

    zoomIn() {
      this.scale = Math.min(+(this.scale + 0.25).toFixed(2), 3.0)
    },

    zoomOut() {
      this.scale = Math.max(+(this.scale - 0.25).toFixed(2), 0.4)
    },

    rotateRight() {
      this.rotation = (this.rotation + 90) % 360
    },

    openExternal() {
      if (this.fileUrl) {
        window.open(this.fileUrl, '_blank', 'noopener,noreferrer')
      }
    },

    queueRenderPage(num) {
      if (this.rendering) {
        this.pendingPageNum = num
      } else {
        this.renderPage(num)
      }
    },

    async renderPage(num) {
      if (!this.pdfDoc || !this.$refs.pdfCanvas) return
      this.rendering = true

      if (this.currentRenderTask) {
        try {
          this.currentRenderTask.cancel()
        } catch (e) {
          // ignore
        }
        this.currentRenderTask = null
      }

      try {
        const page = await this.pdfDoc.getPage(num)
        const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation })
        const canvas = this.$refs.pdfCanvas
        const context = canvas.getContext('2d')

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        this.currentRenderTask = page.render(renderContext)
        await this.currentRenderTask.promise
        this.currentRenderTask = null
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`PdfViewer renderPage ${num} error:`, err)
        }
      } finally {
        this.rendering = false
        if (this.pendingPageNum !== null) {
          const nextNum = this.pendingPageNum
          this.pendingPageNum = null
          this.renderPage(nextNum)
        }
      }
    },

    handleResize() {
      if (this.pdfDoc && !this.loading) {
        clearTimeout(this._resizeTimer)
        this._resizeTimer = setTimeout(() => {
          this.fitToWidth()
        }, 200)
      }
    },
  },
}
</script>

<style scoped>
.pdf-viewer {
  user-select: none;
}
.pdf-toolbar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
.pdf-canvas-card {
  transition: box-shadow 0.2s ease;
  overflow: hidden;
}
</style>
