<script setup lang="ts">
defineProps<{
  headingId: string
  payload: { readonly message?: string, readonly title: string }
}>()
defineEmits<{ cancel: [], confirm: [] }>()
</script>

<template>
  <article class="overlay-content overlay-content--confirmation">
    <h2 :id="headingId" data-overlay-heading tabindex="-1">{{ payload.title }}</h2>
    <p>{{ payload.message }}</p>
    <div class="overlay-content__actions">
      <button data-overlay-initial-focus type="button" @click="$emit('cancel')">Продолжить редактирование</button>
      <button type="button" @click="$emit('confirm')">Отменить изменения</button>
    </div>
  </article>
</template>
