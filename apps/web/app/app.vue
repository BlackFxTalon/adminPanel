<script setup lang="ts">
import AppShell from './components/AppShell.vue'

const route = useRoute()
const auth = useAuthSession()
const userName = computed(() => auth.user.value?.name)
const sessionError = computed(() => auth.error.value)
</script>

<template>
  <NuxtPage v-if="route.path === '/login'" />
  <AppShell v-else :session-error="sessionError" :user-name="userName" @logout="auth.logout">
    <NuxtPage />
  </AppShell>
</template>