import { defineStore } from 'pinia'
import axios from 'axios'
import { clearPushSubscription } from 'src/utils/notifications'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
  }),
  actions: {
    async login(username, password) {
      const res = await axios.post('https://fire.rftuning.id/login', { username, password })
      this.user = res.data

      // Save to localStorage for auto-filling and unread tracking on login page
      localStorage.setItem(
        'clickapp_last_user',
        JSON.stringify({
          id: res.data.id,
          username: res.data.username,
        }),
      )

      this.router.push('/private')
    },
    logout() {
      const currentUserId = this.user?.id
      this.user = null
      if (currentUserId) {
        void clearPushSubscription(currentUserId)
      }
      this.router.push('/login')
    },
  },
  persist: true,
})
