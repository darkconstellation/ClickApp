const NOTIFICATION_SW_URL = '/notification-sw.js'
const DEFAULT_NOTIFICATION_ICON = '/icons/favicon-128x128.png'
const DEFAULT_NOTIFICATION_BADGE = '/icons/favicon-96x96.png'
const API_BASE_URL = 'https://fire.rftuning.id'

let notificationServiceWorkerPromise = null
let vapidPublicKeyPromise = null

export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

export const ensureNotificationServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  if (!notificationServiceWorkerPromise) {
    notificationServiceWorkerPromise = navigator.serviceWorker
      .register(NOTIFICATION_SW_URL)
      .catch((error) => {
        console.error('[Notifications] Failed to register service worker:', error)
        return null
      })
  }

  return notificationServiceWorkerPromise
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(normalized)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

const postMessageToServiceWorker = async (message) => {
  const registration = await ensureNotificationServiceWorker()
  if (!registration) return false

  const readyRegistration = await navigator.serviceWorker.ready.catch(() => registration)
  const controller =
    navigator.serviceWorker.controller || readyRegistration?.active || registration.active
  if (!controller) return false

  controller.postMessage(message)
  return true
}

export const syncPushUserContext = async (userId) => {
  if (!userId || typeof window === 'undefined') return false

  return postMessageToServiceWorker({ type: 'SYNC_PUSH_USER', userId })
}

export const clearPushUserContext = async () => {
  if (typeof window === 'undefined') return false

  return postMessageToServiceWorker({ type: 'CLEAR_PUSH_USER' })
}

export const fetchPushPublicKey = async () => {
  if (!vapidPublicKeyPromise) {
    vapidPublicKeyPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/push/vapid-public-key`)
        if (!response.ok) {
          throw new Error(`Failed to load push public key: ${response.status}`)
        }

        const data = await response.json()
        return data.public_key || null
      } catch (error) {
        console.error('[Notifications] Failed to fetch VAPID public key:', error)
        vapidPublicKeyPromise = null
        return null
      }
    })()
  }

  return vapidPublicKeyPromise
}

export const registerPushSubscription = async (userId) => {
  if (!userId || typeof window === 'undefined' || !('PushManager' in window)) {
    return null
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    await syncPushUserContext(userId)
    return null
  }

  const registration = await ensureNotificationServiceWorker()
  if (!registration?.pushManager) {
    return null
  }

  const readyRegistration = await navigator.serviceWorker.ready.catch(() => registration)
  const activeRegistration = readyRegistration || registration
  if (!activeRegistration?.pushManager) {
    return null
  }

  const publicKey = await fetchPushPublicKey()
  if (!publicKey) {
    return null
  }

  const subscription =
    (await activeRegistration.pushManager.getSubscription()) ||
    (await activeRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  await fetch(`${API_BASE_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      subscription: subscription.toJSON(),
    }),
  })

  await syncPushUserContext(userId)
  return subscription
}

export const clearPushSubscription = async (userId) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager?.getSubscription()

    if (subscription) {
      try {
        await fetch(
          `${API_BASE_URL}/push/subscribe?user_id=${encodeURIComponent(userId || '')}&endpoint=${encodeURIComponent(subscription.endpoint)}`,
          { method: 'DELETE' },
        )
      } catch (error) {
        console.error('[Notifications] Failed to delete backend push subscription:', error)
      } finally {
        await subscription.unsubscribe()
      }
    }

    await clearPushUserContext()
    return true
  } catch (error) {
    console.error('[Notifications] Failed to clear push subscription:', error)
    return false
  }
}

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  try {
    return await Notification.requestPermission()
  } catch (error) {
    console.error('[Notifications] Permission request failed:', error)
    return 'denied'
  }
}

export const showSystemNotification = async ({
  title,
  body = '',
  icon = DEFAULT_NOTIFICATION_ICON,
  badge = DEFAULT_NOTIFICATION_BADGE,
  tag,
  data = {},
  requireInteraction = false,
  silent = false,
  vibrate,
}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    data,
    requireInteraction,
    silent,
    renotify: true,
  }

  if (Array.isArray(vibrate) && vibrate.length > 0) {
    notificationOptions.vibrate = vibrate
  }

  try {
    const registration = await ensureNotificationServiceWorker()

    const readyRegistration = await navigator.serviceWorker.ready.catch(() => registration)
    const activeRegistration = readyRegistration || registration

    if (activeRegistration?.showNotification) {
      await activeRegistration.showNotification(title, notificationOptions)
    } else {
      new Notification(title, notificationOptions)
    }

    return true
  } catch (error) {
    console.error('[Notifications] Failed to show system notification:', error)
    return false
  }
}
