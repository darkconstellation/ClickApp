<template>
  <q-layout>
    <q-page-container>
      <q-page class="login-page" :class="{ 'shake-animation': isShaking }">
        <!-- Left Section: Branding -->
        <div class="left-section">
          <img src="/logo.png" alt="ClickApp" class="app-logo" />
          <p class="tagline">Leverage SDN/NFV and cloud computing technologies</p>
          <p class="tagline">Build a centralized O&M system</p>
          <p class="tagline">
            Provide a highly scalable, flexible, and elastic network to ensure smooth operations
          </p>
        </div>

        <!-- Right Section: Login Card -->
        <div class="right-section">
          <q-card class="login-card" flat>
            <q-card-section>
              <div class="login-title">Login</div>

              <q-form @submit="onSubmit" class="q-gutter-y-md">
                <q-input
                  v-model="username"
                  placeholder="Username"
                  outlined
                  dense
                  lazy-rules
                  :rules="
                    lastUser
                      ? []
                      : [(val) => (val && val.length > 0) || 'Please type your username']
                  "
                >
                  <template v-slot:prepend>
                    <q-icon name="person_outline" color="grey-6" />
                  </template>
                </q-input>

                <q-input
                  v-model="password"
                  placeholder="Please enter password"
                  :type="showPassword ? 'text' : 'password'"
                  outlined
                  dense
                  lazy-rules
                >
                  <template v-slot:prepend>
                    <q-icon name="lock_outline" color="grey-6" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showPassword ? 'keyboard_hide' : 'keyboard'"
                      color="grey-6"
                      class="cursor-pointer"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>

                <q-checkbox
                  v-model="rememberUser"
                  label="Remember Username"
                  color="primary"
                  dense
                  class="remember-check"
                />

                <q-btn
                  label="Login"
                  type="submit"
                  color="primary"
                  class="full-width login-btn"
                  :loading="loading"
                  unelevated
                />

                <div class="text-center text-caption cookies-note">Cookies must be allowed.</div>

                <q-slide-transition>
                  <div v-if="lastUser" class="text-center unread-info q-mt-sm">
                    <div v-if="unreadPrivate > 0" class="text-caption text-negative q-mb-xs">
                      {{ unreadPrivate }} alarms occured.
                    </div>
                    <div v-if="unreadWork > 0" class="text-caption text-warning q-mb-xs">
                      {{ unreadWork }} errors occured.
                    </div>
                    <div v-if="unreadTesting > 0" class="text-caption text-info q-mb-xs">
                      {{ unreadTesting }} warnings occured.
                    </div>
                  </div>
                </q-slide-transition>
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Footer -->
          <div class="login-footer">
            <span
              class="footer-text"
              @click="clearLastUser"
              :style="{ cursor: lastUser ? 'pointer' : 'default' }"
              >&copy; 2025 Orion Community. All Rights Reserved.</span
            >
          </div>
        </div>

        <!-- Earth background image -->
        <img src="/earth.png" alt="" class="earth-bg" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useQuasar } from 'quasar'
import { listenForSignal } from 'src/utils/fcm'
import { registerPushSubscription, requestNotificationPermission } from 'src/utils/notifications'
import axios from 'axios'

const authStore = useAuthStore()
const $q = useQuasar()

const username = ref('')
const password = ref('')
const loading = ref(false)

const lastUser = ref(null)
const unreadPrivate = ref(0)
const unreadWork = ref(0)
const unreadTesting = ref(0)
const isShaking = ref(false)
const showPassword = ref(false)
const rememberUser = ref(true)

let stopListening = null
let blinkInterval = null
const originalTitle = document.title

const startTitleBlink = () => {
  if (blinkInterval) return
  let isPing = true
  blinkInterval = setInterval(() => {
    document.title = isPing ? '🔴 PING!' : originalTitle
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

onMounted(() => {
  const storedUser = localStorage.getItem('clickapp_last_user')
  if (storedUser) {
    lastUser.value = JSON.parse(storedUser)

    fetchUnreadCount()

    let initialSignalIgnored = false
    // Listen for real-time Firebase signal triggers
    stopListening = listenForSignal(lastUser.value.id, (data) => {
      fetchUnreadCount()
      if (initialSignalIgnored && data && data.isPing) {
        triggerPingEffects()
      }
      initialSignalIgnored = true
    })
  }
})

onUnmounted(() => {
  if (stopListening) {
    stopListening()
  }
  stopTitleBlink()
})

const fetchUnreadCount = async () => {
  if (!lastUser.value) return
  try {
    const resPrivate = await axios.get(
      `https://fire.rftuning.id/messages/unread/${lastUser.value.id}?room=private`,
    )
    const resWork = await axios.get(
      `https://fire.rftuning.id/messages/unread/${lastUser.value.id}?room=work`,
    )
    const resTesting = await axios.get(
      `https://fire.rftuning.id/messages/unread/${lastUser.value.id}?room=testing`,
    )

    unreadPrivate.value = resPrivate.data.unread || 0
    unreadWork.value = resWork.data.unread || 0
    unreadTesting.value = resTesting.data.unread || 0
  } catch (err) {
    console.error('Failed to fetch unread count', err)
  }
}

// const clearLastUser = () => {
//   localStorage.removeItem('clickapp_last_user')
//   lastUser.value = null
//   username.value = ''
//   unreadPrivate.value = 0
//   unreadWork.value = 0
//   unreadTesting.value = 0
//   if (stopListening) {
//     stopListening()
//     stopListening = null
//   }
// }

const onSubmit = async () => {
  loading.value = true
  const notificationPermissionPromise =
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'default'
      ? requestNotificationPermission()
      : Promise.resolve(
          typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
        )

  try {
    await notificationPermissionPromise
    const user = username.value || (lastUser.value ? lastUser.value.username : '')
    await authStore.login(user, password.value)
    void registerPushSubscription(authStore.user?.id)
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Login failed' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  font-family: 'Microsoft YaHei', 'Segoe UI', Arial, sans-serif;
  background: linear-gradient(160deg, #36b9f4 0%, #a07be8 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8% 0 10%;
  position: relative;
  overflow: hidden;
}

/* ---- Left branding ---- */
.left-section {
  z-index: 1;
  max-width: 520px;
}

.app-logo {
  height: 56px;
  margin-bottom: 32px;
}

.tagline {
  color: #fff;
  font-size: 16px;
  line-height: 3;
  /* letter-spacing: 4px; */
  margin: 0;
}

/* ---- Right login card ---- */
.right-section {
  z-index: 1;
}

.login-card {
  width: 320px;
  border-radius: 6px;
  padding: 8px 16px;
}

/* ---- Mobile responsive ---- */
@media (max-width: 600px) {
  .login-page {
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: 40px 24px 32px;
    overflow-y: auto;
    gap: 36px;
  }

  .left-section {
    order: 1;
    max-width: 100%;
    text-align: center;
  }

  .right-section {
    order: 2;
    width: 100%;
  }

  .login-card {
    width: 100%;
    box-sizing: border-box;
  }

  .app-logo {
    height: 40px;
    margin-bottom: 16px;
  }

  .tagline {
    font-size: 13px;
    line-height: 1.8;
  }

  .earth-bg {
    display: none;
  }
}

.login-title {
  text-align: center;
  font-size: 32px;
  font-weight: 500;
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 14px;
}

.remember-check {
  font-size: 13px;
  color: #666;
}

.login-btn {
  font-size: 15px;
  padding: 10px 0;
  margin-top: 4px;
}

.cookies-note {
  color: #999;
  margin-top: 8px;
}

.unread-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.unread-info {
  margin-bottom: 16px;
}

/* ---- Earth background ---- */
.earth-bg {
  position: absolute;
  bottom: -10%;
  left: -5%;
  width: 55%;
  max-width: 700px;
  opacity: 0.75;
  pointer-events: none;
  user-select: none;
}

/* ---- Footer ---- */
.login-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin-top: 4px;
}

/* ---- Shake / PING animation ---- */
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
</style>
