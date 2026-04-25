import { defineStore } from 'pinia'

const DEFAULT_CHAT_TIMEOUT_SECONDS = 30
const DEFAULT_MEDIA_TIMEOUT_SECONDS = 300

const normalizeTimeout = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback

  return Math.max(1, Math.floor(parsed))
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    chatTimeoutSeconds: DEFAULT_CHAT_TIMEOUT_SECONDS,
    mediaTimeoutSeconds: DEFAULT_MEDIA_TIMEOUT_SECONDS,
  }),
  actions: {
    normalizeTimeouts() {
      this.chatTimeoutSeconds = normalizeTimeout(
        this.chatTimeoutSeconds,
        DEFAULT_CHAT_TIMEOUT_SECONDS,
      )
      this.mediaTimeoutSeconds = normalizeTimeout(
        this.mediaTimeoutSeconds,
        DEFAULT_MEDIA_TIMEOUT_SECONDS,
      )
    },
    setChatTimeoutSeconds(value) {
      this.chatTimeoutSeconds = normalizeTimeout(value, DEFAULT_CHAT_TIMEOUT_SECONDS)
    },
    setMediaTimeoutSeconds(value) {
      this.mediaTimeoutSeconds = normalizeTimeout(value, DEFAULT_MEDIA_TIMEOUT_SECONDS)
    },
    resetTimeouts() {
      this.chatTimeoutSeconds = DEFAULT_CHAT_TIMEOUT_SECONDS
      this.mediaTimeoutSeconds = DEFAULT_MEDIA_TIMEOUT_SECONDS
    },
  },
  persist: true,
})
