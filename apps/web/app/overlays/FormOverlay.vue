<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  headingId: string
  payload: { readonly initialValue?: string, readonly title: string }
}>()
const emit = defineEmits<{ close: [], dirtyChange: [dirty: boolean] }>()
const value = ref(props.payload.initialValue ?? '')

function updateValue(nextValue: string): void {
  value.value = nextValue
  emit('dirtyChange', value.value !== (props.payload.initialValue ?? ''))
}
</script>

<template>
  <form class="overlay-content overlay-content--form" @submit.prevent>
    <header class="overlay-content__header">
      <h2 :id="headingId" data-overlay-heading tabindex="-1">{{ payload.title }}</h2>
      <button aria-label="Закрыть" type="button" @click="$emit('close')">×</button>
    </header>
    <label>
      Название
      <input
        data-overlay-initial-focus
        :value="value"
        @input="updateValue(($event.target as HTMLInputElement).value)"
      >
    </label>
  </form>
</template>
