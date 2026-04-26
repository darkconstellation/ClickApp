<template>
  <div
    class="chat-container column"
    :class="{ 'shake-animation': isShaking }"
    :style="{
      backgroundImage: `url(${bgChat})`,
      backgroundSize: 'auto',
      backgroundPosition: 'top left',
      backgroundRepeat: 'repeat',
    }"
  >
    <!-- Header (col-auto: does NOT scroll) -->
    <div
      class="col-auto q-pa-sm text-white row items-center"
      style="width: 100%; background-color: #161717"
    >
      <q-btn dense round unelevated icon="menu" color="grey-9" @click="toggleLeftDrawer" />
      <div class="text-subtitle1 q-ml-sm">{{ title }}</div>
      <q-space />
      <div class="row items-center no-wrap" style="gap: 8px">
        <q-btn
          v-if="contactId"
          color="grey-9"
          text-color="orange-10"
          dense
          round
          unelevated
          icon="notifications_active"
          @click="sendPing"
        />
        <q-circular-progress
          :value="(idleCountdown / chatTimeoutSeconds) * 100"
          size="28px"
          :thickness="0.25"
          :color="idleCountdown <= 5 ? 'negative' : idleCountdown <= 10 ? 'warning' : 'orange-10'"
          track-color="grey-6"
          class="idle-timer cursor-pointer"
          @click="handleIdleTimerClick"
        >
          <span class="idle-timer-text" :class="{ 'text-negative': idleCountdown <= 5 }">
            {{ idleCountdown }}
          </span>
        </q-circular-progress>
      </div>
    </div>

    <!-- Chat scroll area: ONLY this div scrolls -->
    <div class="col chat-scroll" ref="scrollContainer" @scroll="onScroll">
      <!-- Top sentinel: loading indicator / beginning of conversation -->
      <div class="row justify-center q-py-sm">
        <q-spinner v-if="isLoadingOlder" color="grey-5" size="24px" />
        <span
          v-else-if="!hasMoreOlder && messages.length > 0"
          class="text-caption text-grey-6 q-py-xs"
        >
          Beginning of conversation
        </span>
      </div>

      <!-- Message list -->
      <div class="q-px-sm q-pb-sm" style="overflow: hidden">
        <template v-for="(msg, index) in messages" :key="msg.id">
          <!-- Date separator -->
          <div
            v-if="index === 0 || !isSameDay(messages[index - 1].sent_at, msg.sent_at)"
            class="date-separator row justify-center q-my-sm"
          >
            <span class="date-separator-label">{{ formatDateLabel(msg.sent_at) }}</span>
          </div>

          <div
            :data-msg-id="msg.id"
            class="msg-row"
            :class="{
              'msg-row--sent': msg.sender_id === currentUser.id,
              'msg-row--received': msg.sender_id !== currentUser.id,
            }"
            @mouseenter="hoveredMsgId = msg.id"
            @mouseleave="hoveredMsgId = null"
          >
            <div class="msg-bubble-wrapper">
              <!-- Dropdown trigger -->
              <transition name="fade">
                <q-btn
                  v-show="hoveredMsgId === msg.id"
                  class="msg-dropdown-btn"
                  :class="{
                    'msg-dropdown-btn--sent': msg.sender_id === currentUser.id,
                    'msg-dropdown-btn--received': msg.sender_id !== currentUser.id,
                  }"
                  flat
                  dense
                  round
                  size="xs"
                  icon="keyboard_arrow_down"
                  color="grey-5"
                >
                  <q-menu anchor="bottom right" self="top right" class="msg-context-menu">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup @click="showMessageInfo(msg)">
                        <q-item-section avatar><q-icon name="info" size="20px" /></q-item-section>
                        <q-item-section>Message Info</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="setReplyTo(msg)">
                        <q-item-section avatar><q-icon name="reply" size="20px" /></q-item-section>
                        <q-item-section>Reply</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup @click="reactToMessage()">
                        <q-item-section avatar
                          ><q-icon name="sentiment_satisfied_alt" size="20px"
                        /></q-item-section>
                        <q-item-section>React</q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item clickable v-close-popup @click="deleteMessage(msg)">
                        <q-item-section avatar
                          ><q-icon name="delete" size="20px" color="negative"
                        /></q-item-section>
                        <q-item-section class="text-negative">Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </transition>

              <!-- Custom message bubble (WhatsApp-style, single bubble) -->
              <div
                class="msg-bubble text-white"
                :class="
                  msg.content === 'PING!'
                    ? 'bg-orange-9'
                    : msg.sender_id === currentUser.id
                      ? 'msg-bubble--sent bg-green-10'
                      : 'msg-bubble--received bg-grey-9'
                "
              >
                <!-- Reply preview quote (if this message is a reply) -->
                <div
                  v-if="msg.reply_to"
                  class="reply-preview-in-bubble"
                  @click="scrollToMessage(msg.reply_to.message_id)"
                >
                  <div class="reply-preview-bar" />
                  <div class="reply-preview-body">
                    <div class="reply-preview-sender">
                      {{
                        msg.reply_to.sender_id === currentUser.id
                          ? 'You'
                          : msg.reply_to.sender_username || props.contactName || 'Contact'
                      }}
                    </div>
                    <div class="reply-preview-text">
                      <q-icon
                        v-if="msg.reply_to.is_media"
                        name="photo_camera"
                        size="14px"
                        class="q-mr-xs"
                      />
                      {{
                        msg.reply_to.is_media
                          ? 'Photo'
                          : msg.reply_to.content
                            ? msg.reply_to.content.length > 80
                              ? msg.reply_to.content.substring(0, 80) + '...'
                              : msg.reply_to.content
                            : ''
                      }}
                    </div>
                  </div>
                </div>

                <!-- Media content -->
                <div v-if="msg.is_media">
                  <!-- Video with thumbnail -->
                  <div v-if="isVideoContent(msg) && msg.thumbnail_url">
                    <div
                      v-if="thumbCache[msg.id]"
                      class="video-thumb-wrapper"
                      @click="openVideoPreview(msg)"
                      @contextmenu.prevent
                      @dragstart.prevent
                    >
                      <img
                        :src="thumbCache[msg.id]"
                        class="chat-media-img"
                        draggable="false"
                        @contextmenu.prevent
                        @dragstart.prevent
                      />
                      <div class="video-play-overlay">
                        <q-icon name="play_circle_filled" size="48px" color="white" />
                      </div>
                    </div>
                    <div v-else class="text-caption text-grey-5 q-py-xs">
                      <q-spinner size="16px" class="q-mr-xs" /> Decrypting...
                    </div>
                  </div>
                  <!-- Image or legacy video (no thumbnail) -->
                  <div v-else-if="mediaCache[msg.id]">
                    <img
                      v-if="mediaCache[msg.id].type.startsWith('image/')"
                      :src="mediaCache[msg.id].url"
                      class="chat-media-img"
                      draggable="false"
                      @contextmenu.prevent
                      @dragstart.prevent
                      @click="openMediaPreview(mediaCache[msg.id].url, msg)"
                    />
                    <video
                      v-else-if="mediaCache[msg.id].type.startsWith('video/')"
                      :src="mediaCache[msg.id].url"
                      class="chat-media-video"
                      controls
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      disablePictureInPicture
                      playsinline
                      draggable="false"
                      @contextmenu.prevent
                      @dragstart.prevent
                    />
                  </div>
                  <div v-else class="text-caption text-grey-5 q-py-xs">
                    <q-spinner size="16px" class="q-mr-xs" /> Decrypting...
                  </div>
                </div>

                <!-- Text content -->
                <span v-if="!msg.is_media && msg.content" class="msg-text">
                  <q-icon
                    v-if="msg.content === 'PING!'"
                    name="notifications_active"
                    size="18px"
                    class="q-mr-xs"
                  />
                  {{ msg.content }}
                </span>

                <!-- Meta: timestamp + status ticks -->
                <div class="msg-meta">
                  <span class="msg-time">{{ formatTimestamp(msg.sent_at) }}</span>
                  <q-icon
                    v-if="msg.sender_id === currentUser.id"
                    :name="getStatusIcon(msg.status)"
                    :color="getStatusColor(msg.status)"
                    size="14px"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Bottom anchor -->
      <div ref="bottomAnchor" style="height: 1px" />
    </div>

    <!-- FAB: scroll-to-bottom button (shown when not at bottom + new messages) -->
    <transition name="fade">
      <div v-if="showScrollDown" class="scroll-down-fab">
        <q-btn round color="grey-9" icon="keyboard_arrow_down" size="md" @click="onFabClick">
          <q-badge v-if="newUnreadCount > 0" color="negative" floating>
            {{ newUnreadCount }}
          </q-badge>
        </q-btn>
      </div>
    </transition>

    <!-- Send area (col-auto: does NOT scroll) -->
    <div class="col-auto send-area">
      <div class="send-area-inner">
        <!-- Reply-to preview bar (above input) -->
        <div v-if="replyingTo" class="reply-bar row items-center no-wrap">
          <div class="reply-bar-accent" />
          <div class="reply-bar-content col">
            <div class="text-caption text-bold" style="color: #00a884">
              {{ replyingTo.sender_id === currentUser.id ? 'You' : props.contactName || 'Contact' }}
            </div>
            <div class="text-caption text-grey-4 ellipsis">
              <q-icon v-if="replyingTo.is_media" name="photo_camera" size="14px" class="q-mr-xs" />
              {{ replyingTo.is_media ? 'Photo' : replyingTo.content }}
            </div>
          </div>
          <q-btn flat dense round icon="close" size="sm" color="grey-5" @click="cancelReply" />
        </div>
        <div
          v-if="isUploading"
          class="row items-center justify-center q-py-xs text-caption text-grey-5"
        >
          <q-spinner size="14px" class="q-mr-xs" /> Encrypting & uploading...
        </div>
        <q-form @submit.prevent="sendMessage" class="row items-center q-pa-xs" style="gap: 4px">
          <div class="col-auto">
            <q-btn
              round
              dense
              flat
              icon="add"
              color="grey-1"
              size="md"
              @click="triggerFileUpload"
            />
          </div>
          <div class="col">
            <q-input
              ref="messageInputRef"
              v-model="newMessage"
              filled
              dark
              placeholder="Type a message..."
              dense
              class="message-input"
              bg-color="grey-9"
              @keydown.enter.exact.prevent="sendMessage"
            />
          </div>
          <div class="col-auto">
            <q-btn round dense flat icon="send" color="grey-1" size="md" @click="sendMessage" />
          </div>
        </q-form>
        <input
          type="file"
          ref="fileInput"
          style="display: none"
          accept="image/*,video/*"
          @change="onFileSelected"
        />
      </div>
    </div>

    <!-- Media Preview Dialog (WhatsApp Web style) -->
    <q-dialog
      v-model="previewDialog"
      maximized
      transition-show="fade"
      transition-hide="fade"
      @hide="resetZoom"
    >
      <div
        class="preview-overlay column items-center justify-center"
        @click.self="onOverlayClick"
        @wheel.prevent="onPreviewWheel"
        @contextmenu.prevent
      >
        <div class="preview-header row items-center q-px-md q-py-sm">
          <q-btn
            v-if="previewMsg"
            flat
            round
            icon="save_alt"
            color="white"
            size="sm"
            @click.stop="openSaveDialog"
          >
            <q-tooltip>Save to Album</q-tooltip>
          </q-btn>
          <q-space />
          <template v-if="!previewIsVideo">
            <q-btn
              flat
              round
              icon="zoom_out"
              color="white"
              size="sm"
              :disable="previewZoom <= 0.5"
              @click.stop="previewZoom = Math.max(0.5, previewZoom - 0.25)"
            />
            <span
              class="text-white text-caption q-mx-sm"
              style="min-width: 38px; text-align: center"
              >{{ Math.round(previewZoom * 100) }}%</span
            >
            <q-btn
              flat
              round
              icon="zoom_in"
              color="white"
              size="sm"
              :disable="previewZoom >= 4"
              @click.stop="previewZoom = Math.min(4, previewZoom + 0.25)"
            />
          </template>
          <q-btn
            flat
            round
            icon="close"
            color="white"
            size="md"
            class="q-ml-sm"
            @click="previewDialog = false"
          />
        </div>
        <div class="preview-body col column items-center justify-center" style="overflow: hidden">
          <!-- Video loading -->
          <div v-if="previewIsVideo && previewVideoLoading" class="column items-center">
            <q-spinner color="white" size="48px" />
            <div class="text-grey-4 q-mt-md">Decrypting video...</div>
          </div>
          <!-- Video player -->
          <video
            v-else-if="previewIsVideo && previewVideoUrl"
            :src="previewVideoUrl"
            class="preview-video"
            controls
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            playsinline
            draggable="false"
            @contextmenu.prevent
            @dragstart.prevent
            autoplay
          />
          <!-- Image viewer -->
          <img
            v-else-if="!previewIsVideo"
            :src="previewUrl"
            class="preview-image"
            :class="{ 'preview-image--grabbing': isPanning }"
            :style="{
              transform: `translate(${panX}px, ${panY}px) scale(${previewZoom})`,
              transformOrigin: 'center center',
              cursor: previewZoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
            }"
            draggable="false"
            @contextmenu.prevent
            @dragstart.prevent
            @mousedown.prevent="onPanStart"
          />
        </div>
      </div>
    </q-dialog>

    <!-- Save to Album Dialog -->
    <q-dialog v-model="saveAlbumDialog">
      <q-card dark style="min-width: 320px" class="bg-grey-10">
        <q-card-section>
          <div class="text-h6 text-white">
            <q-icon name="save_alt" color="amber" class="q-mr-sm" />Save to Album
          </div>
        </q-card-section>
        <q-card-section>
          <q-list dark dense>
            <q-item
              v-for="album in saveAlbums"
              :key="album.id"
              clickable
              v-ripple
              @click="saveToAlbum(album)"
            >
              <q-item-section avatar>
                <q-icon name="folder" color="amber" />
              </q-item-section>
              <q-item-section>{{ album.name }}</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" @click="saveAlbumDialog = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick, onMounted, onUnmounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import bgChat from 'src/assets/bg_chat.jpg'
import { encryptBlob, decryptBlob } from 'src/utils/crypto'
import { buildMediaUrl } from 'src/utils/mediaUrl'
import { useAuthStore } from 'stores/auth'
import { useSettingsStore } from 'stores/settings'
import { useUnreadStore } from 'stores/unread'
import { useQuasar } from 'quasar'
import { sendSignal, listenForSignal } from 'src/utils/fcm'
import { generateImageThumbnail, generateVideoThumbnail, isVideoFile } from 'src/utils/video'
import axios from 'axios'

const props = defineProps(['title', 'contactId', 'contactName', 'room'])
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const unreadStore = useUnreadStore()
const $q = useQuasar()
const router = useRouter()
const toggleLeftDrawer = inject('toggleLeftDrawer')
const chatTimeoutSeconds = computed(() => settingsStore.chatTimeoutSeconds)
const chatUploadFolderByRoom = {
  private: 'Private',
  work: 'Work',
  testing: 'Testing',
}

const messages = ref([])
const newMessage = ref('')
const currentUser = computed(() => authStore.user || {})
const scrollContainer = ref(null)
const bottomAnchor = ref(null)
const fileInput = ref(null)
const isShaking = ref(false)

const isLoadingOlder = ref(false)
const hasMoreOlder = ref(true)
const oldestCursor = ref(null)
const isAtBottom = ref(true)
const showScrollDown = ref(false)
const newUnreadCount = ref(0)
const isUploading = ref(false)

const replyingTo = ref(null)
const hoveredMsgId = ref(null)
const messageInputRef = ref(null)

const previewDialog = ref(false)
const previewUrl = ref('')
const previewZoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const previewIsVideo = ref(false)
const previewVideoUrl = ref('')
const previewVideoLoading = ref(false)
const previewMsg = ref(null)
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0
let didPan = false

const resetZoom = () => {
  previewZoom.value = 1
  panX.value = 0
  panY.value = 0
  isPanning.value = false
  previewIsVideo.value = false
  previewVideoUrl.value = ''
  previewVideoLoading.value = false
}

const onOverlayClick = () => {
  if (!didPan) previewDialog.value = false
  didPan = false
}

const onPanStart = (e) => {
  if (previewZoom.value <= 1) return
  isPanning.value = true
  didPan = false
  panStartX = e.clientX
  panStartY = e.clientY
  panOriginX = panX.value
  panOriginY = panY.value
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', onPanEnd)
}

const onPanMove = (e) => {
  if (!isPanning.value) return
  const dx = e.clientX - panStartX
  const dy = e.clientY - panStartY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan = true
  panX.value = panOriginX + dx
  panY.value = panOriginY + dy
}

const onPanEnd = () => {
  isPanning.value = false
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
}

const onPreviewWheel = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.min(4, Math.max(0.5, Math.round((previewZoom.value + delta) * 100) / 100))
  if (newZoom <= 1) {
    panX.value = 0
    panY.value = 0
  }
  previewZoom.value = newZoom
}

const LIMIT = 30

// ---------- Scroll logic ----------

const onScroll = () => {
  const el = scrollContainer.value
  if (!el) return

  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  isAtBottom.value = distanceFromBottom < 80

  if (isAtBottom.value) {
    showScrollDown.value = false
    newUnreadCount.value = 0
  } else {
    showScrollDown.value = true
  }

  // Load older when near top
  if (el.scrollTop < 100 && hasMoreOlder.value && !isLoadingOlder.value) {
    loadOlderMessages()
  }
}

// When user reaches bottom, mark all in-view unread messages as read
watch(isAtBottom, async (val) => {
  if (val) {
    const unread = messages.value.filter(
      (m) => m.receiver_id === currentUser.value.id && m.status !== 'read',
    )
    if (unread.length > 0) {
      await markRead(unread)
      unread.forEach((m) => (m.status = 'read'))
      // Notify sender so they see the read (blue) ticks
      if (props.contactId) sendSignal(props.contactId, false)
    }
  }
})

const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    const el = scrollContainer.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  })
}

const onFabClick = () => {
  showScrollDown.value = false
  newUnreadCount.value = 0
  scrollToBottom(true)
}

// ---------- Load messages ----------

const loadInitial = async () => {
  if (!props.contactId) return
  try {
    const res = await axios.get(
      `https://fire.rftuning.id/messages/${props.room}/${currentUser.value.id}/${props.contactId}?limit=${LIMIT}`,
    )
    if (res.data.length > 0) {
      messages.value = [...res.data].reverse()
      oldestCursor.value = res.data[res.data.length - 1].id
      hasMoreOlder.value = res.data.length === LIMIT
      await markRead(res.data)
      scrollToBottom()
    } else {
      hasMoreOlder.value = false
    }
  } catch (err) {
    console.error('loadInitial error', err)
  }
}

const loadOlderMessages = async () => {
  if (!props.contactId || isLoadingOlder.value || !hasMoreOlder.value) return
  isLoadingOlder.value = true

  const el = scrollContainer.value
  const prevScrollHeight = el ? el.scrollHeight : 0
  const prevScrollTop = el ? el.scrollTop : 0

  try {
    const res = await axios.get(
      `https://fire.rftuning.id/messages/${props.room}/${currentUser.value.id}/${props.contactId}?limit=${LIMIT}&cursor=${oldestCursor.value}`,
    )
    if (res.data.length > 0) {
      const older = [...res.data].reverse()
      messages.value = [...older, ...messages.value]
      oldestCursor.value = res.data[res.data.length - 1].id
      hasMoreOlder.value = res.data.length === LIMIT

      // Maintain scroll position (no jump when prepending)
      await nextTick()
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop
      }
    } else {
      hasMoreOlder.value = false
    }
  } catch (err) {
    console.error('loadOlderMessages error', err)
  } finally {
    isLoadingOlder.value = false
  }
}

// ---------- Fetch new messages (on Firebase signal) ----------

const fetchUpdates = async () => {
  if (!props.contactId || !currentUser.value.id) return
  try {
    const res = await axios.get(
      `https://fire.rftuning.id/messages/${props.room}/${currentUser.value.id}/${props.contactId}?limit=20`,
    )
    if (res.data.length === 0) return

    const existingIds = new Set(messages.value.map((m) => m.id))

    // Sync statuses for existing messages (e.g., sent → received → read)
    for (const apiMsg of res.data) {
      const existing = messages.value.find((m) => m.id === apiMsg.id)
      if (existing && existing.status !== apiMsg.status) {
        existing.status = apiMsg.status
        if (apiMsg.received_at) existing.received_at = apiMsg.received_at
        if (apiMsg.read_at) existing.read_at = apiMsg.read_at
      }
    }

    const newMsgs = [...res.data].reverse().filter((m) => !existingIds.has(m.id))
    if (newMsgs.length === 0) return

    messages.value = [...messages.value, ...newMsgs]

    const incomingToMe = newMsgs.filter((m) => m.receiver_id === currentUser.value.id)

    if (isAtBottom.value) {
      // Auto-scroll and mark as read immediately
      scrollToBottom(true)
      if (incomingToMe.length > 0) {
        await markRead(incomingToMe)
        incomingToMe.forEach((m) => (m.status = 'read'))
        // Notify sender so they see the read (blue) ticks
        sendSignal(props.contactId, false)
      }
    } else if (incomingToMe.length > 0) {
      // Show FAB with unread badge, update drawer count
      newUnreadCount.value += incomingToMe.length
      showScrollDown.value = true
      unreadStore.fetchAll(currentUser.value.id)
    }

    // Ping effects
    const hasPing = newMsgs.some(
      (m) => m.receiver_id === currentUser.value.id && m.content === 'PING!',
    )
    if (hasPing) triggerPingEffects()
  } catch (err) {
    console.error('fetchUpdates error', err)
  }
}

const markRead = async (msgs) => {
  if (!msgs || msgs.length === 0) return
  const unreadIds = msgs
    .filter((m) => m.receiver_id === currentUser.value.id && m.status !== 'read')
    .map((m) => m.id)
  if (unreadIds.length === 0) return
  try {
    await axios.put(`https://fire.rftuning.id/messages/${props.room}/status`, {
      message_ids: unreadIds,
      status: 'read',
    })
    unreadStore.fetchAll(currentUser.value.id)
  } catch (err) {
    console.error('markRead error', err)
  }
}

// ---------- Send ----------

const sendMessage = async () => {
  if (!newMessage.value.trim() || !props.contactId) return
  try {
    const isPingMsg = newMessage.value === 'PING!'
    const payload = {
      receiver_id: props.contactId,
      content: newMessage.value,
      is_media: false,
    }
    if (replyingTo.value) {
      payload.reply_to = {
        message_id: replyingTo.value.id,
        sender_id: replyingTo.value.sender_id,
        sender_username:
          replyingTo.value.sender_id === currentUser.value.id
            ? currentUser.value.username
            : props.contactName || '',
        content: replyingTo.value.is_media ? null : replyingTo.value.content,
        is_media: replyingTo.value.is_media || false,
      }
    }
    const res = await axios.post(
      `https://fire.rftuning.id/messages/${props.room}?sender_id=${currentUser.value.id}`,
      payload,
    )
    messages.value.push(res.data)
    newMessage.value = ''
    replyingTo.value = null
    scrollToBottom(true)
    sendSignal(props.contactId, isPingMsg)
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Failed to send message' })
  }
}

const sendPing = async () => {
  newMessage.value = 'PING!'
  await sendMessage()
}

// ---------- Reply / Context Menu ----------

const setReplyTo = (msg) => {
  replyingTo.value = msg
  nextTick(() => {
    messageInputRef.value?.focus()
  })
}

const cancelReply = () => {
  replyingTo.value = null
}

const scrollToMessage = (msgId) => {
  const el = scrollContainer.value
  if (!el) return
  const msgEl = el.querySelector(`[data-msg-id="${msgId}"]`)
  if (msgEl) {
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    msgEl.classList.add('msg-highlight')
    setTimeout(() => msgEl.classList.remove('msg-highlight'), 1500)
  }
}

const showMessageInfo = (msg) => {
  const sentTime = msg.sent_at
    ? new Date(msg.sent_at.endsWith('Z') ? msg.sent_at : msg.sent_at + 'Z').toLocaleString()
    : '-'
  const recvTime = msg.received_at
    ? new Date(
        msg.received_at.endsWith('Z') ? msg.received_at : msg.received_at + 'Z',
      ).toLocaleString()
    : '-'
  const readTime = msg.read_at
    ? new Date(msg.read_at.endsWith('Z') ? msg.read_at : msg.read_at + 'Z').toLocaleString()
    : '-'

  $q.dialog({
    title: 'Message Info',
    message: `<div style="line-height:1.8">
      <b>From:</b> ${msg.sender_id === currentUser.value.id ? 'You' : props.contactName || 'Contact'}<br>
      <b>Status:</b> ${msg.status}<br>
      <b>Sent:</b> ${sentTime}<br>
      <b>Delivered:</b> ${recvTime}<br>
      <b>Read:</b> ${readTime}
    </div>`,
    html: true,
    dark: true,
    ok: { flat: true, label: 'Close' },
  })
}

const reactToMessage = () => {
  $q.notify({ type: 'info', message: 'Reactions coming soon!' })
}

const deleteMessage = async (msg) => {
  $q.dialog({
    title: 'Delete Message',
    message: 'Are you sure you want to delete this message?',
    dark: true,
    cancel: { flat: true, label: 'Cancel' },
    ok: { flat: true, label: 'Delete', color: 'negative' },
  }).onOk(async () => {
    try {
      await axios.delete(`https://fire.rftuning.id/messages/${props.room}/${msg.id}`)
      messages.value = messages.value.filter((m) => m.id !== msg.id)
      if (replyingTo.value?.id === msg.id) replyingTo.value = null
    } catch (err) {
      console.error('Delete error', err)
      $q.notify({ type: 'negative', message: 'Failed to delete message' })
    }
  })
}

// ---------- PING effects ----------

let stopListening = null
let blinkInterval = null
const originalTitle = document.title

const startTitleBlink = () => {
  if (blinkInterval) return
  let isPing = true
  blinkInterval = setInterval(() => {
    document.title = isPing ? '🔴 App!' : originalTitle
    isPing = !isPing
  }, 500)
  window.addEventListener('focus', stopTitleBlink, { once: true })
}

const stopTitleBlink = () => {
  if (blinkInterval) {
    clearInterval(blinkInterval)
    blinkInterval = null
  }
  document.title = originalTitle
}

const triggerPingEffects = () => {
  if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, 1000)
  if (!document.hasFocus()) startTitleBlink()
}

// ---------- Idle countdown timer ----------

const idleCountdown = ref(chatTimeoutSeconds.value)
let idleInterval = null

const resetIdleCountdown = () => {
  idleCountdown.value = chatTimeoutSeconds.value
}

const startIdleCountdown = () => {
  if (idleInterval) return

  idleInterval = setInterval(() => {
    if (idleCountdown.value > 0) idleCountdown.value--
  }, 1000)
}

const stopIdleCountdown = () => {
  if (idleInterval) {
    clearInterval(idleInterval)
    idleInterval = null
  }
}

const handleIdleTimerClick = () => {
  authStore.logout()
  router.push('/login')
}

watch(chatTimeoutSeconds, resetIdleCountdown, { immediate: true })

// ---------- Lifecycle ----------

onMounted(async () => {
  await loadInitial()
  if (currentUser.value.id) {
    stopListening = listenForSignal(currentUser.value.id, () => {
      fetchUpdates()
    })
  }
  resetIdleCountdown()
  startIdleCountdown()
  window.addEventListener('mousemove', resetIdleCountdown)
  window.addEventListener('keydown', resetIdleCountdown)
  window.addEventListener('click', resetIdleCountdown)
  window.addEventListener('scroll', resetIdleCountdown)
})

onUnmounted(() => {
  if (stopListening) stopListening()
  stopTitleBlink()
  stopIdleCountdown()
  window.removeEventListener('mousemove', resetIdleCountdown)
  window.removeEventListener('keydown', resetIdleCountdown)
  window.removeEventListener('click', resetIdleCountdown)
  window.removeEventListener('scroll', resetIdleCountdown)
})

// Reset when contact changes (e.g. navigating between chat pages)
watch(
  () => props.contactId,
  async (newId) => {
    if (!newId) return
    messages.value = []
    oldestCursor.value = null
    hasMoreOlder.value = true
    showScrollDown.value = false
    newUnreadCount.value = 0
    isAtBottom.value = true
    replyingTo.value = null
    hoveredMsgId.value = null
    await loadInitial()
  },
)

// ---------- Helpers ----------

const formatTimestamp = (ts) => {
  if (!ts) return ''
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z')
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const isSameDay = (ts1, ts2) => {
  if (!ts1 || !ts2) return false
  const d1 = new Date(ts1.endsWith('Z') ? ts1 : ts1 + 'Z')
  const d2 = new Date(ts2.endsWith('Z') ? ts2 : ts2 + 'Z')
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const formatDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const getStatusIcon = (status) => {
  if (status === 'sent') return 'check'
  if (status === 'received' || status === 'read') return 'done_all'
  return 'schedule'
}

const getStatusColor = (status) => {
  if (status === 'read') return 'info'
  return 'grey-5'
}

// ---------- Media ----------

const mediaCache = reactive({}) // { msgId: { url, type } }
const thumbCache = reactive({}) // { msgId: objectUrl } — video thumbnails

const isVideoContent = (msg) => {
  if (!msg.is_media || !msg.content) return false
  return msg.content.startsWith('video/')
}

const decryptMediaForMsg = async (msg) => {
  if (!msg.is_media || !msg.media_url) return

  // Prefer thumbnail URLs for both images and videos when available.
  if (msg.thumbnail_url && !thumbCache[msg.id]) {
    try {
      const res = await axios.get(buildMediaUrl(msg.thumbnail_url), {
        responseType: 'text',
      })
      const colonIdx = msg.content ? msg.content.indexOf('::') : -1
      const originalType = colonIdx !== -1 ? msg.content.substring(0, colonIdx) : 'image/png'
      const thumbType = isVideoContent(msg) ? 'image/jpeg' : originalType
      const blob = await decryptBlob(res.data, thumbType)
      thumbCache[msg.id] = URL.createObjectURL(blob)
    } catch (err) {
      console.error('Decrypt thumbnail error', err)
    }
    return
  }

  // For images or legacy videos without thumbnail: decrypt the full media
  try {
    const res = await axios.get(buildMediaUrl(msg.media_url), {
      responseType: 'text',
    })
    const colonIdx = msg.content ? msg.content.indexOf('::') : -1
    const originalType = colonIdx !== -1 ? msg.content.substring(0, colonIdx) : 'image/png'
    const blob = await decryptBlob(res.data, originalType)
    const url = URL.createObjectURL(blob)
    mediaCache[msg.id] = { url, type: originalType }
  } catch (err) {
    console.error('Decrypt media error', err)
  }
}

// Auto-decrypt media messages when they appear
watch(
  () => messages.value.length,
  () => {
    messages.value.forEach((msg) => {
      if (msg.is_media) {
        if (isVideoContent(msg) && msg.thumbnail_url) {
          if (!thumbCache[msg.id]) decryptMediaForMsg(msg)
        } else if (!mediaCache[msg.id]) {
          decryptMediaForMsg(msg)
        }
      }
    })
  },
)

const openMediaPreview = (url, msg = null) => {
  previewIsVideo.value = false
  previewUrl.value = url
  previewMsg.value = msg
  previewZoom.value = 1
  previewDialog.value = true
}

const openVideoPreview = async (msg) => {
  previewIsVideo.value = true
  previewVideoLoading.value = true
  previewVideoUrl.value = ''
  previewMsg.value = msg
  previewDialog.value = true

  // If already decrypted in mediaCache, use it
  if (mediaCache[msg.id]) {
    previewVideoUrl.value = mediaCache[msg.id].url
    previewVideoLoading.value = false
    return
  }

  // Decrypt the full video on demand
  try {
    const res = await axios.get(buildMediaUrl(msg.media_url), {
      responseType: 'text',
    })
    const colonIdx = msg.content ? msg.content.indexOf('::') : -1
    const originalType = colonIdx !== -1 ? msg.content.substring(0, colonIdx) : 'video/mp4'
    const blob = await decryptBlob(res.data, originalType)
    const url = URL.createObjectURL(blob)
    mediaCache[msg.id] = { url, type: originalType }
    previewVideoUrl.value = url
  } catch (err) {
    console.error('Video decrypt error', err)
    $q.notify({ type: 'negative', message: 'Failed to decrypt video' })
    previewDialog.value = false
  } finally {
    previewVideoLoading.value = false
  }
}

const triggerFileUpload = () => {
  fileInput.value.value = '' // reset so same file can be re-selected
  fileInput.value.click()
}

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!props.contactId) {
    $q.notify({ type: 'warning', message: 'No contact selected' })
    return
  }

  isUploading.value = true
  try {
    const isVideo = isVideoFile(file)
    const uploadFolder = chatUploadFolderByRoom[props.room] || props.room || ''
    const mediaUploadUrl = uploadFolder
      ? `https://fire.rftuning.id/media?folder=${encodeURIComponent(uploadFolder)}`
      : 'https://fire.rftuning.id/media'
    const thumbnailUploadUrl = uploadFolder
      ? `https://fire.rftuning.id/media?folder=${encodeURIComponent(`${uploadFolder}/thumbnail`)}`
      : 'https://fire.rftuning.id/media'

    if (isVideo) {
      // Generate 4-frame thumbnail
      let thumbnailBlob = null
      try {
        thumbnailBlob = await generateVideoThumbnail(file)
      } catch (e) {
        console.warn('Thumbnail generation failed', e)
      }

      // Encrypt video
      const { encryptedBlob, originalType } = await encryptBlob(file)

      // Upload video into the room folder
      const videoForm = new FormData()
      videoForm.append('file', encryptedBlob, `${Date.now()}_${file.name}.enc`)
      const videoRes = await axios.post(mediaUploadUrl, videoForm)
      const videoUrl = videoRes.data

      // Upload encrypted thumbnail into the room thumbnail folder
      let thumbnailUrl = null
      if (thumbnailBlob) {
        const { encryptedBlob: encThumb } = await encryptBlob(thumbnailBlob)
        const thumbForm = new FormData()
        thumbForm.append('file', encThumb, `thumb_${Date.now()}_${file.name}.enc`)
        const thumbRes = await axios.post(thumbnailUploadUrl, thumbForm)
        thumbnailUrl = thumbRes.data
      }

      // Send message with video + thumbnail URLs
      const res = await axios.post(
        `https://fire.rftuning.id/messages/${props.room}?sender_id=${currentUser.value.id}`,
        {
          receiver_id: props.contactId,
          content: `${originalType}::${file.name}`,
          media_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          is_media: true,
        },
      )
      messages.value.push(res.data)
      scrollToBottom(true)
      sendSignal(props.contactId, false)

      // Cache thumbnail locally
      if (thumbnailBlob) {
        thumbCache[res.data.id] = URL.createObjectURL(thumbnailBlob)
      }
    } else {
      // Image: create and upload a resized thumbnail photo
      let thumbnailBlob = null
      try {
        thumbnailBlob = await generateImageThumbnail(file)
      } catch (thumbnailErr) {
        console.warn('Image thumbnail generation failed', thumbnailErr)
        thumbnailBlob = file
      }

      const { encryptedBlob, originalType } = await encryptBlob(file)

      const formData = new FormData()
      formData.append('file', encryptedBlob, `${Date.now()}_${file.name}.enc`)
      const uploadRes = await axios.post(mediaUploadUrl, formData)
      const mediaUrl = uploadRes.data

      let thumbnailUrl = null
      if (thumbnailBlob) {
        const { encryptedBlob: encThumb } = await encryptBlob(thumbnailBlob)
        const thumbForm = new FormData()
        thumbForm.append('file', encThumb, `thumb_${Date.now()}_${file.name}.enc`)
        const thumbRes = await axios.post(thumbnailUploadUrl, thumbForm)
        thumbnailUrl = thumbRes.data
      }

      const res = await axios.post(
        `https://fire.rftuning.id/messages/${props.room}?sender_id=${currentUser.value.id}`,
        {
          receiver_id: props.contactId,
          content: `${originalType}::${file.name}`,
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          is_media: true,
        },
      )
      messages.value.push(res.data)
      scrollToBottom(true)
      sendSignal(props.contactId, false)

      const localUrl = thumbnailBlob
        ? URL.createObjectURL(thumbnailBlob)
        : URL.createObjectURL(file)
      mediaCache[res.data.id] = { url: localUrl, type: originalType }
    }
  } catch (err) {
    console.error('Media upload error', err)
    $q.notify({ type: 'negative', message: 'Failed to send media' })
  } finally {
    isUploading.value = false
  }
}

// ---------- Save to Album ----------

const saveAlbumDialog = ref(false)
const saveAlbums = ref([])
const saving = ref(false)

const openSaveDialog = async () => {
  try {
    const res = await axios.get('https://fire.rftuning.id/albums')
    saveAlbums.value = res.data
    saveAlbumDialog.value = true
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load albums' })
  }
}

const saveToAlbum = async (album) => {
  if (!album || !previewMsg.value) return
  saving.value = true
  try {
    const msg = previewMsg.value
    const colonIdx = msg.content ? msg.content.indexOf('::') : -1
    const mediaType =
      colonIdx !== -1 ? msg.content.substring(0, colonIdx) : 'application/octet-stream'
    const filename = colonIdx !== -1 ? msg.content.substring(colonIdx + 2) : 'media'

    await axios.post('https://fire.rftuning.id/save-to-album', {
      album_id: album.id,
      media_url: msg.media_url,
      thumbnail_url: msg.thumbnail_url || null,
      filename,
      media_type: mediaType,
      is_video: mediaType.startsWith('video/'),
    })

    saveAlbumDialog.value = false
    $q.notify({ type: 'positive', message: `Saved to ${album.name}!` })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Container: fixed height, no overflow — only chat-scroll scrolls */
.chat-container {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  overflow-x: hidden;
  position: relative;
}

/* The only scrollable element */
.chat-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

@media (min-width: 640px) {
  .chat-scroll {
    padding-left: 40px;
    padding-right: 40px;
  }
}

.chat-scroll::-webkit-scrollbar {
  width: 5px;
}

.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.chat-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.chat-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Media in chat bubbles */
.chat-media-img {
  max-width: 280px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

.chat-media-video {
  max-width: 280px;
  max-height: 300px;
  border-radius: 8px;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

/* Idle timer */
.idle-timer {
  opacity: 0.8;
  transition: opacity 0.3s;
}
.idle-timer:hover {
  opacity: 1;
}
.idle-timer-text {
  font-size: 10px;
  font-weight: 600;
  color: #9e9e9e;
  transition: color 0.3s;
}

/* Send area styling */
.send-area {
  background-color: rgba(0, 0, 0, 0);
  padding: 3px 5px;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.send-area-inner {
  background-color: rgba(38, 38, 38);
  border-radius: 32px;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* FAB scroll-to-bottom button */
.scroll-down-fab {
  position: absolute;
  bottom: 72px;
  right: 8px;
  z-index: 10;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
}

/* Fade transition for FAB */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Shake / PING animation */
.shake-animation {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  animation-iteration-count: 2;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
}

@keyframes shake {
  0% {
    transform: translate(2px, 2px);
  }
  10% {
    transform: translate(-2px, -3px);
  }
  20% {
    transform: translate(-4px, 1px);
  }
  30% {
    transform: translate(4px, 3px);
  }
  40% {
    transform: translate(2px, -2px);
  }
  50% {
    transform: translate(-2px, 3px);
  }
  60% {
    transform: translate(-4px, 2px);
  }
  70% {
    transform: translate(4px, 2px);
  }
  80% {
    transform: translate(-2px, -2px);
  }
  90% {
    transform: translate(2px, 3px);
  }
  100% {
    transform: translate(2px, -3px);
  }
}

/* ---------- Date separator ---------- */

.date-separator-label {
  background: #00bcd4;
  color: #474646;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 12px;
  letter-spacing: 0.3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* ---------- Message row & dropdown ---------- */

.msg-row {
  position: relative;
  display: flex;
  margin-bottom: 2px;
  max-width: 100%;
  overflow: hidden;
}
.msg-row--sent {
  justify-content: flex-end;
}
.msg-row--received {
  justify-content: flex-start;
}

.msg-bubble-wrapper {
  position: relative;
  max-width: 65%;
  width: fit-content;
}

.msg-dropdown-btn {
  position: absolute;
  top: 4px;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.15s ease;
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(4px);
}
.msg-dropdown-btn--sent {
  right: 4px;
}
.msg-dropdown-btn--received {
  right: 4px;
}
.msg-row:hover .msg-dropdown-btn {
  opacity: 1;
}

.msg-context-menu {
  background: #233138 !important;
  border-radius: 8px !important;
}
.msg-context-menu .q-item {
  color: #e9edef;
  min-height: 36px;
}
.msg-context-menu .q-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* ---------- Custom message bubble ---------- */

.msg-bubble {
  display: block;
  border-radius: 7.5px;
  padding: 5px 8px 3px 9px;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 72px;
}

.msg-bubble--sent {
  border-radius: 7.5px 7.5px 0 7.5px;
}

.msg-bubble--received {
  border-radius: 0 7.5px 7.5px 7.5px;
}

.msg-text {
  font-size: 14.2px;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  display: block;
  margin-bottom: 1px;
}

.msg-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  white-space: nowrap;
}

.msg-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 15px;
}

/* ---------- Reply preview bar (above input) ---------- */

.reply-bar {
  background: #1a2c33;
  border-left: none;
  padding: 8px 8px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.reply-bar-accent {
  width: 4px;
  align-self: stretch;
  background: #00a884;
  border-radius: 4px;
  margin: 0 10px;
  flex-shrink: 0;
}
.reply-bar-content {
  overflow: hidden;
}

/* ---------- Reply preview inside bubble ---------- */

.reply-preview-in-bubble {
  display: flex;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 7px;
  padding: 6px 10px 6px 0;
  margin-bottom: 5px;
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  min-width: 0;
}
.reply-preview-in-bubble:hover {
  background: rgba(0, 0, 0, 0.25);
}

.reply-preview-bar {
  width: 4px;
  min-height: 100%;
  align-self: stretch;
  background: #06cf9c;
  border-radius: 4px 0 0 4px;
  margin-right: 8px;
  flex-shrink: 0;
}

/* Different accent color for contact's messages */
.msg-row--received .reply-preview-bar {
  background: #53bdeb;
}
.msg-row--received .reply-preview-sender {
  color: #53bdeb !important;
}

.reply-preview-body {
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

.reply-preview-sender {
  font-size: 12.5px;
  color: #06cf9c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.reply-preview-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  margin-top: 1px;
  display: flex;
  align-items: center;
}

/* ---------- Scroll-to highlight flash ---------- */

.msg-highlight {
  animation: highlightFlash 1.5s ease;
}

@keyframes highlightFlash {
  0% {
    background-color: rgba(0, 168, 132, 0.35);
  }
  100% {
    background-color: transparent;
  }
}

/* Image preview dialog (WhatsApp Web style) */
.preview-overlay {
  background: rgba(0, 0, 0, 0.92);
  width: 100%;
  height: 100%;
  cursor: default;
}

.preview-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
}

.preview-body {
  width: 100%;
  height: 100%;
  padding: 48px 24px 24px;
}

.preview-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  transition: transform 0.1s ease;
  will-change: transform;
}

.preview-video {
  max-width: 92vw;
  max-height: 85vh;
  border-radius: 4px;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

/* Video thumbnail wrapper in chat bubble */
.video-thumb-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  transition: background 0.2s;
}

.video-thumb-wrapper:hover .video-play-overlay {
  background: rgba(0, 0, 0, 0.45);
}
</style>
