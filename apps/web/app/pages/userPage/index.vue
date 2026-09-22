<script setup lang="ts">
import UserDetailView from '../../users/UserDetailView.vue'

useHead({ title: 'Профиль — AdminPanel' })
const auth = useAuthSession()
const currentUser = computed(() => auth.user.value ?? undefined)
</script>

<template>
  <UserDetailView v-if="currentUser" :current-user="currentUser" />
</template>
