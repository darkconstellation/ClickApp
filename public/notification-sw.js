const API_BASE_URL = 'https://fire.rftuning.id'
const DEFAULT_NOTIFICATION_ICON = '/icons/favicon-128x128.png'
const DEFAULT_NOTIFICATION_BADGE = '/icons/favicon-96x96.png'
const DEFAULT_TARGET_URL = '/#/private'
const PUSH_DB_NAME = 'clickapp-push'
const PUSH_DB_STORE = 'settings'
const PUSH_USER_ID_KEY = 'current-user-id'

const openPushDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PUSH_DB_STORE)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const setPushSetting = async (key, value) => {
  const database = await openPushDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_DB_STORE, 'readwrite')
    transaction.objectStore(PUSH_DB_STORE).put(value, key)
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => reject(transaction.error)
  })
}

const getPushSetting = async (key) => {
  const database = await openPushDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_DB_STORE, 'readonly')
    const request = transaction.objectStore(PUSH_DB_STORE).get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

const deletePushSetting = async (key) => {
  const database = await openPushDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_DB_STORE, 'readwrite')
    transaction.objectStore(PUSH_DB_STORE).delete(key)
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => reject(transaction.error)
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const data = event.data || {}

  if (data.type === 'SYNC_PUSH_USER' && data.userId) {
    event.waitUntil(setPushSetting(PUSH_USER_ID_KEY, data.userId))
  }

  if (data.type === 'CLEAR_PUSH_USER') {
    event.waitUntil(deletePushSetting(PUSH_USER_ID_KEY))
  }
})

const getVisibleClientList = async () => {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return clientList.filter((client) => client.visibilityState === 'visible')
}

const focusOrOpenTarget = async (targetUrl) => {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  for (const client of clientList) {
    if ('focus' in client) {
      await client.focus()

      if (client.url !== targetUrl && 'navigate' in client) {
        try {
          await client.navigate(targetUrl)
        } catch (error) {
          console.error('[Notification SW] Failed to navigate focused client:', error)
        }
      }

      return
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(targetUrl)
  }
}

const showFallbackNotification = async () => {
  await self.registration.showNotification('ClickApp', {
    body: 'New message',
    icon: DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_BADGE,
    data: {
      url: new URL(DEFAULT_TARGET_URL, self.location.origin).href,
    },
    renotify: true,
  })
}

const showLatestNotification = async () => {
  const userId = await getPushSetting(PUSH_USER_ID_KEY)
  if (!userId) {
    await showFallbackNotification()
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/notifications/latest/${userId}`)
    if (!response.ok) {
      throw new Error(`Notification preview request failed: ${response.status}`)
    }

    const payload = await response.json()
    const latest = payload.latest

    if (!latest) {
      return
    }

    const notificationOptions = {
      body: latest.body || 'New message',
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_BADGE,
      data: {
        room: latest.room,
        url: latest.url || new URL(DEFAULT_TARGET_URL, self.location.origin).href,
      },
      tag: latest.room || 'clickapp-message',
      renotify: true,
      requireInteraction: Boolean(latest.is_ping),
      silent: false,
    }

    if (latest.is_ping) {
      notificationOptions.vibrate = [300, 100, 300, 100, 300]
    }

    await self.registration.showNotification(latest.title || 'ClickApp', notificationOptions)
  } catch (error) {
    console.error('[Notification SW] Failed to show latest notification:', error)
    await showFallbackNotification()
  }
}

self.addEventListener('notificationclick', (event) => {
  const targetUrl =
    event.notification?.data?.url || new URL(DEFAULT_TARGET_URL, self.location.origin).href

  event.notification.close()
  event.waitUntil(focusOrOpenTarget(targetUrl))
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const visibleClients = await getVisibleClientList()

      if (visibleClients.length > 0) {
        return
      }

      await showLatestNotification()
    })(),
  )
})
