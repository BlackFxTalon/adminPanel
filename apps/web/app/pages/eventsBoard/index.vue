<script setup lang="ts">
import EventsBoardView from '../../events/EventsBoardView.vue'
import { createMockEventsBoardData } from '../../events/mock-events-board-data'

useHead({ title: 'Лента событий — AdminPanel' })
const eventsData = createMockEventsBoardData()
</script>

<template>
  <EventsBoardView :data="eventsData" />
</template>
