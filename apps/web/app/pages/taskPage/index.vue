<script setup lang="ts">
import TasksListView from '../../tasks/TasksListView.vue'
import { useTasksData } from '../../tasks/tasks-data-provider'

useHead({ title: 'Задачи — AdminPanel' })
const auth = useAuthSession()
const currentUser = computed(() => auth.user.value ?? undefined)
const tasksData = useTasksData()
</script>

<template>
  <TasksListView :data="tasksData" :current-user="currentUser" />
</template>
