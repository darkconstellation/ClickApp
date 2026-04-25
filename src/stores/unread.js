import { defineStore } from 'pinia'
import axios from 'axios'

export const useUnreadStore = defineStore('unread', {
  state: () => ({
    private: 0,
    work: 0,
    testing: 0,
  }),
  actions: {
    async fetchAll(userId) {
      if (!userId) return
      try {
        const [r1, r2, r3] = await Promise.all([
          axios.get(`https://fire.rftuning.id/messages/unread/${userId}?room=private`),
          axios.get(`https://fire.rftuning.id/messages/unread/${userId}?room=work`),
          axios.get(`https://fire.rftuning.id/messages/unread/${userId}?room=testing`),
        ])
        this.private = r1.data.unread || 0
        this.work = r2.data.unread || 0
        this.testing = r3.data.unread || 0
      } catch (e) {
        console.error('Failed to fetch unread counts', e)
      }
    },
  },
})
