<template>
  <q-page class="media-page">
    <!-- ===== ALBUM LIST VIEW ===== -->
    <div v-if="!currentAlbum" class="column" style="min-height: 100%">
      <!-- Header bar -->
      <div class="col-auto q-pa-sm text-white row items-center" style="background-color: #161717">
        <q-btn dense round unelevated icon="menu" color="grey-9" @click="toggleLeftDrawer" />
        <q-icon name="perm_media" size="24px" color="amber" class="q-ml-sm" />
        <div class="text-subtitle1 q-ml-sm">Media Albums</div>
      </div>
      <div class="q-pa-md">
        <div v-if="loadingAlbums" class="row justify-center q-pa-xl">
          <q-spinner color="orange" size="48px" />
        </div>

        <div v-else class="row q-col-gutter-md">
          <div v-for="album in albums" :key="album.id" class="col-6 col-sm-4 col-md-3">
            <q-card
              class="album-card cursor-pointer"
              dark
              flat
              bordered
              @click="promptPassword(album)"
            >
              <q-card-section class="column items-center q-pa-lg">
                <q-icon name="folder" size="64px" color="amber" />
                <div class="text-subtitle1 text-white q-mt-sm text-center">
                  {{ album.name }}
                </div>
                <q-icon name="lock" size="16px" color="grey-6" class="q-mt-xs" />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== ALBUM CONTENTS VIEW ===== -->
    <div v-else class="column" style="height: 100%">
      <!-- Album header bar -->
      <div class="col-auto q-pa-sm text-white row items-center" style="background-color: #161717">
        <q-btn dense round unelevated icon="menu" color="grey-9" @click="toggleLeftDrawer" />
        <q-btn
          dense
          round
          flat
          icon="arrow_back"
          color="white"
          @click="closeAlbum"
          class="q-ml-xs"
        />
        <q-icon name="folder_open" size="24px" color="amber" class="q-ml-sm" />
        <div class="text-subtitle1 q-ml-sm">{{ currentAlbum.name }}</div>
        <q-space />
        <q-btn
          dense
          round
          unelevated
          icon="add_photo_alternate"
          color="green-9"
          @click="triggerUpload"
        >
          <q-tooltip>Upload Media</q-tooltip>
        </q-btn>
      </div>

      <!-- Upload progress bar -->
      <q-linear-progress v-if="uploading" :value="uploadProgress" color="amber" class="col-auto" />

      <!-- File grid -->
      <div class="col q-pa-sm" style="overflow-y: auto">
        <div v-if="loadingFiles" class="row justify-center q-pa-xl">
          <q-spinner color="orange" size="48px" />
        </div>

        <div v-else-if="albumFiles.length === 0" class="column items-center q-pa-xl">
          <q-icon name="cloud_upload" size="80px" color="grey-7" />
          <div class="text-grey-5 q-mt-md text-subtitle1">No files yet. Upload some media!</div>
        </div>

        <div v-else class="row q-col-gutter-sm">
          <div v-for="file in albumFiles" :key="file.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
            <q-card class="file-card" dark flat bordered>
              <!-- Thumbnail / preview -->
              <div class="file-thumb cursor-pointer" @click="openViewer(file)">
                <!-- Decrypted thumbnail ready -->
                <img v-if="thumbCache[file.id]" :src="thumbCache[file.id]" class="thumb-img" />
                <!-- Fallback icon while decrypting -->
                <div v-else class="thumb-placeholder column items-center justify-center">
                  <q-spinner v-if="decryptingSet.has(file.id)" color="grey-5" size="24px" />
                  <q-icon
                    v-else
                    :name="file.is_video ? 'videocam' : 'image'"
                    size="40px"
                    color="grey-6"
                  />
                </div>
                <!-- Video badge -->
                <q-badge
                  v-if="file.is_video"
                  floating
                  color="red"
                  label="VIDEO"
                  class="text-weight-bold"
                  style="top: 6px; right: 6px"
                />
              </div>

              <!-- File info -->
              <q-card-section class="q-pa-xs">
                <div class="text-caption text-grey-4 ellipsis">{{ file.filename }}</div>
                <div class="row items-center justify-between">
                  <span class="text-caption text-grey-6">{{ formatSize(file.file_size) }}</span>
                  <q-btn
                    flat
                    dense
                    round
                    size="xs"
                    icon="delete"
                    color="negative"
                    @click.stop="confirmDelete(file)"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*,video/*"
      multiple
      style="display: none"
      @change="onFilesSelected"
    />

    <!-- ===== PASSWORD DIALOG ===== -->
    <q-dialog v-model="passwordDialog" persistent>
      <q-card dark style="min-width: 320px" class="bg-grey-10">
        <q-card-section>
          <div class="text-h6 text-white">
            <q-icon name="lock" color="amber" class="q-mr-sm" />
            {{ pendingAlbum?.name }}
          </div>
          <div class="text-caption text-grey-5">Enter password to access this album</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="passwordInput"
            dark
            outlined
            dense
            :type="showPwd ? 'text' : 'password'"
            label="Password"
            color="amber"
            @keyup.enter="submitPassword"
            autofocus
          >
            <template #append>
              <q-icon
                :name="showPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPwd = !showPwd"
              />
            </template>
          </q-input>
          <div v-if="pwdError" class="text-negative text-caption q-mt-xs">
            {{ pwdError }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" @click="passwordDialog = false" />
          <q-btn
            unelevated
            label="Unlock"
            color="amber"
            text-color="black"
            :loading="pwdLoading"
            @click="submitPassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ===== MEDIA VIEWER DIALOG ===== -->
    <q-dialog
      v-model="viewerDialog"
      maximized
      transition-show="fade"
      transition-hide="fade"
      @hide="resetViewerZoom"
    >
      <div
        class="viewer-backdrop column items-center justify-center"
        @click.self="onViewerOverlayClick"
        @wheel.prevent="onViewerWheel"
      >
        <!-- Header with zoom controls -->
        <div class="viewer-header row items-center q-px-md q-py-sm">
          <q-space />
          <template v-if="!viewerIsVideo && viewerUrl">
            <q-btn
              flat
              round
              icon="zoom_out"
              color="white"
              size="sm"
              :disable="viewerZoom <= 0.5"
              @click.stop="viewerZoom = Math.max(0.5, viewerZoom - 0.25)"
            />
            <span
              class="text-white text-caption q-mx-sm"
              style="min-width: 38px; text-align: center"
              >{{ Math.round(viewerZoom * 100) }}%</span
            >
            <q-btn
              flat
              round
              icon="zoom_in"
              color="white"
              size="sm"
              :disable="viewerZoom >= 4"
              @click.stop="viewerZoom = Math.min(4, viewerZoom + 0.25)"
            />
          </template>
          <q-btn
            flat
            round
            icon="close"
            color="white"
            size="md"
            class="q-ml-sm"
            @click="viewerDialog = false"
          />
        </div>

        <!-- Body -->
        <div class="viewer-body col column items-center justify-center" style="overflow: hidden">
          <!-- Loading -->
          <div v-if="viewerLoading" class="column items-center">
            <q-spinner color="amber" size="64px" />
            <div class="text-grey-4 q-mt-md">Decrypting media...</div>
          </div>

          <!-- Image viewer with pan/zoom -->
          <img
            v-else-if="viewerUrl && !viewerIsVideo"
            :src="viewerUrl"
            class="viewer-media"
            :class="{ 'viewer-media--grabbing': viewerPanning }"
            :style="{
              transform: `translate(${viewerPanX}px, ${viewerPanY}px) scale(${viewerZoom})`,
              transformOrigin: 'center center',
              cursor: viewerZoom > 1 ? (viewerPanning ? 'grabbing' : 'grab') : 'zoom-in',
            }"
            @mousedown.prevent="onViewerPanStart"
          />

          <!-- Video player -->
          <video
            v-else-if="viewerUrl && viewerIsVideo"
            :src="viewerUrl"
            class="viewer-media"
            controls
            autoplay
          />
        </div>

        <!-- Filename -->
        <div v-if="viewerFilename" class="viewer-filename text-grey-4">
          {{ viewerFilename }}
        </div>
      </div>
    </q-dialog>

    <!-- ===== DELETE CONFIRM ===== -->
    <q-dialog v-model="deleteDialog">
      <q-card dark class="bg-grey-10" style="min-width: 300px">
        <q-card-section>
          <div class="text-h6 text-white">Delete File</div>
          <div class="text-grey-5 q-mt-sm">
            Delete <strong class="text-orange">{{ pendingDeleteFile?.filename }}</strong
            >? This cannot be undone.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated label="Delete" color="negative" :loading="deleting" @click="doDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { encryptBlob, decryptBlob } from 'src/utils/crypto'
import { generateVideoThumbnail } from 'src/utils/video'

const API = 'https://fire.rftuning.id'
const $q = useQuasar()
const toggleLeftDrawer = inject('toggleLeftDrawer')

// ─── Album list ───
const albums = ref([])
const loadingAlbums = ref(false)

const fetchAlbums = async () => {
  loadingAlbums.value = true
  try {
    const res = await axios.get(`${API}/albums`)
    albums.value = res.data
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load albums' })
  } finally {
    loadingAlbums.value = false
  }
}

onMounted(fetchAlbums)

// ─── Password prompt ───
const passwordDialog = ref(false)
const passwordInput = ref('')
const showPwd = ref(false)
const pwdError = ref('')
const pwdLoading = ref(false)
const pendingAlbum = ref(null)

const promptPassword = (album) => {
  pendingAlbum.value = album
  passwordInput.value = ''
  pwdError.value = ''
  passwordDialog.value = true
}

const submitPassword = async () => {
  pwdLoading.value = true
  pwdError.value = ''
  try {
    await axios.post(`${API}/albums/auth`, {
      album_id: pendingAlbum.value.id,
      password: passwordInput.value,
    })
    currentAlbum.value = pendingAlbum.value
    passwordDialog.value = false
    loadAlbumFiles()
  } catch (e) {
    pwdError.value = e.response?.status === 401 ? 'Wrong password' : 'Error verifying password'
  } finally {
    pwdLoading.value = false
  }
}

// ─── Album contents ───
const currentAlbum = ref(null)
const albumFiles = ref([])
const loadingFiles = ref(false)
const thumbCache = reactive({})
const decryptingSet = reactive(new Set())

const closeAlbum = () => {
  currentAlbum.value = null
  albumFiles.value = []
  // Revoke thumb object URLs
  Object.values(thumbCache).forEach((url) => URL.revokeObjectURL(url))
  Object.keys(thumbCache).forEach((k) => delete thumbCache[k])
}

const loadAlbumFiles = async () => {
  loadingFiles.value = true
  try {
    const res = await axios.get(`${API}/albums/${currentAlbum.value.id}/files`)
    albumFiles.value = res.data
    // Decrypt thumbnails in background
    albumFiles.value.forEach((f) => decryptThumb(f))
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load files' })
  } finally {
    loadingFiles.value = false
  }
}

const decryptThumb = async (file) => {
  if (thumbCache[file.id]) return
  // For videos, use the thumbnail_url; for images, use the media_url
  const url = file.is_video ? file.thumbnail_url : file.media_url
  if (!url) return
  decryptingSet.add(file.id)
  try {
    const res = await axios.get(`${API}${url}`, { responseType: 'text' })
    const mimeType = file.is_video ? 'image/jpeg' : file.media_type
    const blob = await decryptBlob(res.data, mimeType)
    thumbCache[file.id] = URL.createObjectURL(blob)
  } catch (e) {
    console.error('Thumb decrypt error', file.filename, e)
  } finally {
    decryptingSet.delete(file.id)
  }
}

// ─── Media viewer dialog ───
const viewerDialog = ref(false)
const viewerUrl = ref(null)
const viewerIsVideo = ref(false)
const viewerLoading = ref(false)
const viewerFilename = ref('')
const viewerZoom = ref(1)
const viewerPanX = ref(0)
const viewerPanY = ref(0)
const viewerPanning = ref(false)
let vPanStartX = 0
let vPanStartY = 0
let vPanOriginX = 0
let vPanOriginY = 0
let vDidPan = false

const resetViewerZoom = () => {
  viewerZoom.value = 1
  viewerPanX.value = 0
  viewerPanY.value = 0
  viewerPanning.value = false
}

const onViewerOverlayClick = () => {
  if (!vDidPan) viewerDialog.value = false
  vDidPan = false
}

const onViewerPanStart = (e) => {
  if (viewerZoom.value <= 1) return
  viewerPanning.value = true
  vDidPan = false
  vPanStartX = e.clientX
  vPanStartY = e.clientY
  vPanOriginX = viewerPanX.value
  vPanOriginY = viewerPanY.value
  window.addEventListener('mousemove', onViewerPanMove)
  window.addEventListener('mouseup', onViewerPanEnd)
}

const onViewerPanMove = (e) => {
  if (!viewerPanning.value) return
  const dx = e.clientX - vPanStartX
  const dy = e.clientY - vPanStartY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) vDidPan = true
  viewerPanX.value = vPanOriginX + dx
  viewerPanY.value = vPanOriginY + dy
}

const onViewerPanEnd = () => {
  viewerPanning.value = false
  window.removeEventListener('mousemove', onViewerPanMove)
  window.removeEventListener('mouseup', onViewerPanEnd)
}

const openViewer = async (file) => {
  viewerDialog.value = true
  viewerLoading.value = true
  viewerUrl.value = null
  viewerIsVideo.value = file.is_video
  viewerFilename.value = file.filename
  resetViewerZoom()
  try {
    const res = await axios.get(`${API}${file.media_url}`, { responseType: 'text' })
    const blob = await decryptBlob(res.data, file.media_type)
    viewerUrl.value = URL.createObjectURL(blob)
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to decrypt media' })
    viewerDialog.value = false
  } finally {
    viewerLoading.value = false
  }
}

const onViewerWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.min(4, Math.max(0.5, Math.round((viewerZoom.value + delta) * 100) / 100))
  if (newZoom <= 1) {
    viewerPanX.value = 0
    viewerPanY.value = 0
  }
  viewerZoom.value = newZoom
}

// ─── Upload ───
const fileInputRef = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)

const triggerUpload = () => {
  fileInputRef.value.value = ''
  fileInputRef.value.click()
}

const onFilesSelected = async (event) => {
  const files = Array.from(event.target.files)
  if (!files.length || !currentAlbum.value) return

  uploading.value = true
  uploadProgress.value = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const isVideo = file.type.startsWith('video/')

      // Encrypt the file
      const { encryptedBlob, originalType } = await encryptBlob(file)

      // Generate encrypted thumbnail for videos (4-frame collage)
      let encryptedThumbBlob = null
      if (isVideo) {
        try {
          const thumbBlob = await generateVideoThumbnail(file)
          const thumbResult = await encryptBlob(thumbBlob)
          encryptedThumbBlob = thumbResult.encryptedBlob
        } catch (thumbErr) {
          console.warn('Thumbnail generation failed, uploading without thumbnail', thumbErr)
        }
      }

      // Build form data
      const formData = new FormData()
      formData.append('file', encryptedBlob, `${Date.now()}_${file.name}.enc`)
      if (encryptedThumbBlob) {
        formData.append('thumbnail', encryptedThumbBlob, `thumb_${Date.now()}_${file.name}.enc`)
      }
      formData.append('filename', file.name)
      formData.append('media_type', originalType)
      formData.append('is_video', isVideo)
      formData.append('file_size', file.size)

      const res = await axios.post(`${API}/albums/${currentAlbum.value.id}/files`, formData)

      // Add to list and cache a local thumb
      albumFiles.value.unshift(res.data)
      if (isVideo && encryptedThumbBlob) {
        // re-generate the raw thumb for cache (cheaper than decrypting)
        try {
          const rawThumb = await generateVideoThumbnail(file)
          thumbCache[res.data.id] = URL.createObjectURL(rawThumb)
        } catch {
          // fall through
        }
      } else {
        // For images, use the original file as thumb
        thumbCache[res.data.id] = URL.createObjectURL(file)
      }
    } catch (e) {
      console.error('Upload error', file.name, e)
      $q.notify({ type: 'negative', message: `Failed to upload ${file.name}` })
    }
    uploadProgress.value = (i + 1) / files.length
  }

  uploading.value = false
  $q.notify({ type: 'positive', message: `Uploaded ${files.length} file(s)` })
}

// ─── Delete ───
const deleteDialog = ref(false)
const pendingDeleteFile = ref(null)
const deleting = ref(false)

const confirmDelete = (file) => {
  pendingDeleteFile.value = file
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await axios.delete(`${API}/albums/${currentAlbum.value.id}/files/${pendingDeleteFile.value.id}`)
    albumFiles.value = albumFiles.value.filter((f) => f.id !== pendingDeleteFile.value.id)
    // Clean cache
    if (thumbCache[pendingDeleteFile.value.id]) {
      URL.revokeObjectURL(thumbCache[pendingDeleteFile.value.id])
      delete thumbCache[pendingDeleteFile.value.id]
    }
    deleteDialog.value = false
    $q.notify({ type: 'positive', message: 'File deleted' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete file' })
  } finally {
    deleting.value = false
  }
}

// ─── Util ───
const formatSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style lang="scss" scoped>
.media-page {
  min-height: 100%;
}

.album-card {
  background-color: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
  transition: all 0.2s;
  &:hover {
    background-color: #2a2a2a;
    border-color: rgba(255, 193, 7, 0.3);
    transform: translateY(-2px);
  }
}

.file-card {
  background-color: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
}

.file-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background-color: #111;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
}

// Viewer
.viewer-backdrop {
  background: rgba(0, 0, 0, 0.95);
  width: 100%;
  height: 100%;
  position: relative;
}
.viewer-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}
.viewer-body {
  width: 100%;
  height: 100%;
  padding: 48px 24px 24px;
}
.viewer-media {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  transition: transform 0.1s ease;
  will-change: transform;
}
.viewer-media--grabbing {
  cursor: grabbing !important;
}
.viewer-filename {
  position: absolute;
  bottom: 16px;
  font-size: 13px;
}
</style>
