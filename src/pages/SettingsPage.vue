<template>
  <q-page class="settings-page q-pa-md">
    <div class="settings-shell">
      <div class="settings-hero q-mb-md">
        <div class="text-overline text-amber-6">Application Preferences</div>
        <div class="text-h4 text-white q-mt-xs">Settings</div>
        <div class="text-body2 text-grey-5 q-mt-sm settings-copy">
          Adjust inactivity timeout values for chat and media. When the timer expires, the app still
          logs out as before.
        </div>
      </div>

      <q-card class="settings-card" flat bordered>
        <q-card-section class="q-pa-lg">
          <div class="row items-center q-mb-md">
            <q-icon name="schedule" size="24px" color="amber" />
            <div class="text-subtitle1 text-white q-ml-sm">Idle Timeout</div>
          </div>

          <div class="settings-grid q-gutter-y-md">
            <q-input
              v-model="chatTimeoutInput"
              outlined
              dark
              type="number"
              min="1"
              step="1"
              label="Timeout for chatting"
              suffix="seconds"
              hint="Used on Private, Work, Testing, and Settings pages"
              color="amber"
              @blur="restoreEmptyChatTimeout"
            />

            <q-input
              v-model="mediaTimeoutInput"
              outlined
              dark
              type="number"
              min="1"
              step="1"
              label="Timeout for Media"
              suffix="seconds"
              hint="Used while the Media page is active"
              color="amber"
              @blur="restoreEmptyMediaTimeout"
            />
          </div>

          <div class="row items-center justify-between q-mt-lg">
            <div class="text-caption text-grey-5">
              Logout action remains unchanged when the timer expires.
            </div>
            <q-btn flat color="grey-4" label="Restore defaults" @click="resetToDefaults" />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from 'stores/settings'

const settingsStore = useSettingsStore()

const chatTimeoutInput = ref(String(settingsStore.chatTimeoutSeconds))
const mediaTimeoutInput = ref(String(settingsStore.mediaTimeoutSeconds))

watch(
  () => settingsStore.chatTimeoutSeconds,
  (value) => {
    chatTimeoutInput.value = String(value)
  },
  { immediate: true },
)

watch(
  () => settingsStore.mediaTimeoutSeconds,
  (value) => {
    mediaTimeoutInput.value = String(value)
  },
  { immediate: true },
)

watch(chatTimeoutInput, (value) => {
  if (value === '') return
  settingsStore.setChatTimeoutSeconds(value)
})

watch(mediaTimeoutInput, (value) => {
  if (value === '') return
  settingsStore.setMediaTimeoutSeconds(value)
})

const restoreEmptyChatTimeout = () => {
  if (chatTimeoutInput.value === '') {
    chatTimeoutInput.value = String(settingsStore.chatTimeoutSeconds)
  }
}

const restoreEmptyMediaTimeout = () => {
  if (mediaTimeoutInput.value === '') {
    mediaTimeoutInput.value = String(settingsStore.mediaTimeoutSeconds)
  }
}

const resetToDefaults = () => {
  settingsStore.resetTimeouts()
}
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  background:
    radial-gradient(circle at top right, rgba(255, 191, 0, 0.12), transparent 28%),
    radial-gradient(circle at bottom left, rgba(0, 180, 216, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(9, 12, 15, 0.98), rgba(15, 18, 21, 0.98));
}

.settings-shell {
  max-width: 760px;
  margin: 0 auto;
}

.settings-hero {
  padding: 8px 4px 0;
}

.settings-copy {
  max-width: 60ch;
}

.settings-card {
  background: rgba(22, 23, 23, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
}

.settings-grid {
  display: grid;
}
</style>
