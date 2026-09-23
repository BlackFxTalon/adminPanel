<script setup lang="ts">
import type { EventEntry, EventsBoardData } from './events-board-data'
import { computed, onMounted } from 'vue'

import { formatOrderDate } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'

const props = defineProps<{ data: EventsBoardData }>()
const resource = useLatestAsyncResource<readonly EventEntry[]>(true)
const entries = resource.data
const loading = resource.loading
const error = resource.error

const kindLabels = {
  call: 'Звонок',
  contragent: 'Контрагент',
  order: 'Заказ',
} as const

const isEmpty = computed(() => !loading.value && !error.value && (entries.value?.length ?? 0) === 0)

async function load(): Promise<void> {
  await resource.load(() => props.data.latest(), 'Не удалось загрузить события.')
}

onMounted(load)
</script>

<template>
  <section class="events-board" aria-labelledby="events-heading">
    <header class="events-board__header">
      <div>
        <p class="events-board__eyebrow">Организация</p>
        <h1 id="events-heading">Лента событий</h1>
      </div>
    </header>

    <p v-if="loading" class="events-board__state" role="status">Загружаем события…</p>

    <div v-else-if="error" class="events-board__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="isEmpty" class="events-board__state">
      <h2>Событий нет</h2>
      <p>Новые действия появятся в ленте автоматически.</p>
    </div>

    <template v-else-if="entries">
      <ul role="list" class="events-board__list" data-testid="events-list">
        <li v-for="entry in entries" :key="entry.id" class="events-board__item">
          <span class="events-board__kind" :data-testid="`event-kind-${entry.kind}`">{{ kindLabels[entry.kind] }}</span>
          <div class="events-board__body">
            <p class="events-board__title">{{ entry.title }}</p>
            <p class="events-board__detail">{{ entry.detail }}</p>
          </div>
          <time class="events-board__time" :datetime="entry.occurredAt">{{ formatOrderDate(entry.occurredAt) }}</time>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.events-board {
  display: grid;
  gap: var(--space-5);
}

.events-board__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.events-board__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.events-board h1 {
  margin: 0;
}

.events-board__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.events-board__state h2 {
  margin: 0 0 var(--space-2);
}

.events-board__state p {
  margin: 0;
}

.events-board__list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.events-board__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.events-board__kind {
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

.events-board__body {
  min-width: 0;
}

.events-board__title {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}

.events-board__detail {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.events-board__time {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

@media (max-width: 47.99rem) {
  .events-board__item {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .events-board__time {
    order: -1;
  }
}
</style>
