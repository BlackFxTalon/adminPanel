<script setup lang="ts">
defineProps<{
  headingId: string
  payload: { readonly message?: string, readonly title: string }
}>()
defineEmits<{ close: [] }>()
</script>

<template>
  <article class="overlay-content overlay-content--information">
    <header class="overlay-content__header">
      <h2 :id="headingId" data-overlay-heading tabindex="-1">{{ payload.title }}</h2>
      <button aria-label="Закрыть" type="button" @click="$emit('close')">×</button>
    </header>
    <p>{{ payload.message }}</p>
  </article>
</template>
