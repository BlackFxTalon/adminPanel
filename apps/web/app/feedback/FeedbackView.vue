<script setup lang="ts">
import type { FeedbackBoardData, FeedbackTopic } from './feedback-data'
import { computed, onMounted } from 'vue'

import { formatOrderDate } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'

const props = defineProps<{ data: FeedbackBoardData }>()
const resource = useLatestAsyncResource<readonly FeedbackTopic[]>(true)
const topics = resource.data
const loading = resource.loading
const error = resource.error

const sourceLabels = { site: 'Сайт', user: 'Пользователь' } as const
const isEmpty = computed(() => !loading.value && !error.value && (topics.value?.length ?? 0) === 0)

async function load(): Promise<void> {
  await resource.load(() => props.data.topics(), 'Не удалось загрузить обращения.')
}

onMounted(load)
</script>

<template>
  <section class="feedback" aria-labelledby="feedback-heading">
    <header class="feedback__header">
      <div>
        <p class="feedback__eyebrow">Каналы связи</p>
        <h1 id="feedback-heading">Обратная связь</h1>
      </div>
    </header>

    <p v-if="loading" class="feedback__state" role="status">Загружаем обращения…</p>

    <div v-else-if="error" class="feedback__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="isEmpty" class="feedback__state">
      <h2>Обращений нет</h2>
      <p>Новые обращения появятся в списке автоматически.</p>
    </div>

    <div v-else-if="topics" class="feedback__table-wrapper">
      <table>
        <thead>
          <tr>
            <th scope="col">Источник</th>
            <th scope="col">Автор</th>
            <th scope="col">Дата</th>
            <th scope="col">Сообщение</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="topic in topics" :key="topic.id">
            <td><span class="feedback__source">{{ sourceLabels[topic.source] }}</span></td>
            <td>{{ topic.author }}</td>
            <td>{{ formatOrderDate(topic.receivedAt) }}</td>
            <td>{{ topic.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.feedback {
  display: grid;
  gap: var(--space-5);
}

.feedback__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.feedback__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.feedback h1 {
  margin: 0;
}

.feedback__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.feedback__state h2 {
  margin: 0 0 var(--space-2);
}

.feedback__state p {
  margin: 0;
}

.feedback__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.feedback table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

.feedback th,
.feedback td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.feedback th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.feedback__source {
  display: inline-flex;
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

.feedback button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
</style>
