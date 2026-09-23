<script setup lang="ts">
import EmailView from '../../email/EmailView.vue'
import { createMockEmailData } from '../../email/mock-email-data'

useHead({ title: 'Почта — AdminPanel' })
const emailData = createMockEmailData()
</script>

<template>
  <EmailView :data="emailData" />
</template>
