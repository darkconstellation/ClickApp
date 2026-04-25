<template>
  <router-view />
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useSettingsStore } from 'stores/settings'
import { useQuasar } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const $q = useQuasar()

settingsStore.normalizeTimeouts()

let idleTimeout = null

const currentIdleTimeoutSeconds = computed(() => {
  const path = router.currentRoute.value.path

  if (!authStore.user || path === '/login') return null

  return path === '/media' ? settingsStore.mediaTimeoutSeconds : settingsStore.chatTimeoutSeconds
})

const resetIdleTimer = () => {
  if (idleTimeout) clearTimeout(idleTimeout)

  const timeoutSeconds = currentIdleTimeoutSeconds.value
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) return

  idleTimeout = setTimeout(() => {
    authStore.logout()
    $q.notify({ type: 'warning', message: 'You have been logged out due to inactivity.' })
    router.push('/login')
  }, timeoutSeconds * 1000)
}

watch(currentIdleTimeoutSeconds, resetIdleTimer, { immediate: true })

// Watch route and apply dark theme unless on login page
watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    $q.dark.set(newPath !== '/login')
  },
  { immediate: true },
)

const idleEvents = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
  'touchmove',
  'pointerdown',
  'pointermove',
]

onMounted(() => {
  idleEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }))
  resetIdleTimer()
})

onUnmounted(() => {
  idleEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer))
  if (idleTimeout) clearTimeout(idleTimeout)
})
</script>
