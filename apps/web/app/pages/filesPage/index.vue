<script setup lang="ts">
import FilesView from '../../files/FilesView.vue'
import { createMockFilesData } from '../../files/mock-files-data'

useHead({ title: 'Файлы — AdminPanel' })
const filesData = createMockFilesData()
</script>

<template>
  <FilesView :data="filesData" />
</template>
