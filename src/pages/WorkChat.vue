<template>
  <q-page class="fit">
    <chat-box
      title="Work Workspace"
      :contact-id="contactId"
      contact-name="Contact (Work)"
      room="work"
    />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from 'stores/auth'
import ChatBox from 'components/ChatBox.vue'
import axios from 'axios'

const authStore = useAuthStore()
const contactId = ref(null)

onMounted(async () => {
  if (!authStore.user) return
  const res = await axios.get(`https://fire.rftuning.id/contacts/${authStore.user.id}`)
  if (res.data.length > 0) {
    contactId.value = res.data[0].id
  }
})
</script>
