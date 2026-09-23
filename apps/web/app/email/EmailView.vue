<script setup lang="ts">
import type { EmailBoardData, EmailMessage } from './email-data'
import { computed, onMounted, ref } from 'vue'

import { formatOrderDate } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'

const props = defineProps<{ data: EmailBoardData }>()
const resource = useLatestAsyncResource<readonly EmailMessage[]>(true)
const messages = resource.data
const loading = resource.loading
const error = resource.error

const direction = ref<'incoming' | 'outgoing'>('incoming')
const isEmpty = computed(() => !loading.value && !error.value && (messages.value?.length ?? 0) === 0)

async function load(): Promise<void> {
  await resource.load(() => props.data.messages(direction.value), 'Не удалось загрузить письма.')
}

function switchDirection(next: 'incoming' | 'outgoing'): void {
  direction.value = next
  void load()
}

onMounted(load)
</script>

<template>
  <section class="email" aria-labelledby="email-heading">
    <header class="email__header">
      <div>
        <p class="email__eyebrow">Почта</p>
        <h1 id="email-heading">{{ direction === 'incoming' ? 'Входящие' : 'Исходящие' }}</h1>
      </div>
      <div class="email__tabs">
        <button
          type="button"
          :aria-pressed="direction === 'incoming'"
          data-testid="email-tab-incoming"
          @click="switchDirection('incoming')"
        >
          Входящие
        </button>
        <button
          type="button"
          :aria-pressed="direction === 'outgoing'"
          data-testid="email-tab-outgoing"
          @click="switchDirection('outgoing')"
        >
          Исходящие
        </button>
      </div>
    </header>

    <p v-if="loading" class="email__state" role="status">Загружаем письма…</p>

    <div v-else-if="error" class="email__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="isEmpty" class="email__state">
      <h2>Писем нет</h2>
      <p>В этой папке пока пусто.</p>
    </div>

    <div v-else-if="messages" class="email__table-wrapper">
      <table>
        <thead>
          <tr>
            <th scope="col">Контакт</th>
            <th scope="col">Тема</th>
            <th scope="col">Дата</th>
            <th scope="col">Папка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="message in messages" :key="message.id">
            <td>{{ message.contact }}</td>
            <td>{{ message.subject }}</td>
            <td>{{ formatOrderDate(message.receivedAt) }}</td>
            <td>{{ message.folder }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.email {
  display: grid;
  gap: var(--space-5);
}

.email__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.email__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.email h1 {
  margin: 0;
}

.email__tabs {
  display: flex;
  gap: var(--space-2);
}

.email__tabs button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.email__tabs button[aria-pressed='true'] {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.email__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.email__state h2 {
  margin: 0 0 var(--space-2);
}

.email__state p {
  margin: 0;
}

.email__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.email table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

.email th,
.email td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.email th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.email button {
  font: inherit;
}
</style>
