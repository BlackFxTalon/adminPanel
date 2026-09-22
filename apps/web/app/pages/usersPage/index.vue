<script setup lang="ts">
import UsersListView from '../../users/UsersListView.vue'
import { useUsersData } from '../../users/users-data-provider'

useHead({ title: 'Пользователи — AdminPanel' })
const usersData = useUsersData()
</script>

<template>
  <UsersListView :data="usersData" />
</template>
