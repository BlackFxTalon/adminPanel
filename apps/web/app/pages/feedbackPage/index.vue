<script setup lang="ts">
import FeedbackView from '../../feedback/FeedbackView.vue'
import { createMockFeedbackData } from '../../feedback/mock-feedback-data'

useHead({ title: 'Обратная связь — AdminPanel' })
const feedbackData = createMockFeedbackData()
</script>

<template>
  <FeedbackView :data="feedbackData" />
</template>
