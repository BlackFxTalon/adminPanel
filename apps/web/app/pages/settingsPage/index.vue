<script setup lang="ts">
import SettingsView from '../../users/SettingsView.vue'

useHead({ title: 'Настройки — AdminPanel' })
const auth = useAuthSession()
const currentUser = computed(() => auth.user.value ?? undefined)
</script>

<template>
  <SettingsView v-if="currentUser" :current-user="currentUser" />
</template>
