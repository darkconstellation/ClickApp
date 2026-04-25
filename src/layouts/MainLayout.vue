<template>
  <q-layout view="lHh Lpr lFf">
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="text-white"
      style="background-color: #161717"
      :width="200"
    >
      <!-- User info + logout (was in q-header) -->
      <div
        class="row items-center q-pa-sm"
        style="border-bottom: 1px solid rgba(255, 255, 255, 0.1)"
      >
        <q-btn
          flat
          dense
          round
          icon="menu"
          color="white"
          @click="toggleLeftDrawer"
          class="q-mr-xs"
        />
        <div v-if="authStore.user" class="col text-caption text-grey-4 ellipsis">
          {{ authStore.user.username }}
        </div>
        <q-btn flat dense round icon="logout" color="grey-5" size="sm" @click="logout" />
      </div>

      <q-list dark>
        <q-item-label header class="text-grey-5">Navigation</q-item-label>

        <q-item clickable tag="a" to="/private" exact dark>
          <q-item-section avatar><q-icon name="lock" /></q-item-section>
          <q-item-section><q-item-label>Data Script</q-item-label></q-item-section>
          <q-item-section side v-if="unreadStore.private > 0">
            <q-badge color="negative" :label="unreadStore.private" />
          </q-item-section>
        </q-item>

        <q-item clickable tag="a" to="/work" exact dark>
          <q-item-section avatar><q-icon name="work" /></q-item-section>
          <q-item-section><q-item-label>Work</q-item-label></q-item-section>
          <q-item-section side v-if="unreadStore.work > 0">
            <q-badge color="warning" :label="unreadStore.work" />
          </q-item-section>
        </q-item>

        <q-item clickable tag="a" to="/media" exact dark>
          <q-item-section avatar><q-icon name="perm_media" /></q-item-section>
          <q-item-section><q-item-label>Media</q-item-label></q-item-section>
        </q-item>

        <q-item clickable tag="a" to="/testing" exact dark>
          <q-item-section avatar><q-icon name="bug_report" /></q-item-section>
          <q-item-section><q-item-label>Testing</q-item-label></q-item-section>
          <q-item-section side v-if="unreadStore.testing > 0">
            <q-badge color="info" :label="unreadStore.testing" />
          </q-item-section>
        </q-item>

        <q-item clickable tag="a" to="/settings" exact dark>
          <q-item-section avatar><q-icon name="settings" /></q-item-section>
          <q-item-section><q-item-label>Settings</q-item-label></q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-dark" style="overflow-x: hidden">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useUnreadStore } from 'stores/unread'

const leftDrawerOpen = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const unreadStore = useUnreadStore()

let pollInterval = null

onMounted(() => {
  if (authStore.user) {
    unreadStore.fetchAll(authStore.user.id)
    pollInterval = setInterval(() => {
      if (authStore.user) unreadStore.fetchAll(authStore.user.id)
    }, 30000)
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

provide('toggleLeftDrawer', toggleLeftDrawer)

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>
