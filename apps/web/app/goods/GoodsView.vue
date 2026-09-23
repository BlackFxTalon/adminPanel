<script setup lang="ts">
import type { GoodsBoardData, GoodsSection } from './goods-data'
import { computed, onMounted } from 'vue'

import { useLatestAsyncResource } from '../orders/use-latest-async-resource'

const props = defineProps<{ data: GoodsBoardData }>()
const resource = useLatestAsyncResource<readonly GoodsSection[]>(true)
const sections = resource.data
const loading = resource.loading
const error = resource.error

const kindLabels = {
  goods: 'Товары',
  prices: 'Цены',
  categories: 'Категории товаров',
  characteristics: 'Характеристики товаров',
} as const
const isEmpty = computed(() => !loading.value && !error.value && (sections.value?.length ?? 0) === 0)

async function load(): Promise<void> {
  await resource.load(() => props.data.sections(), 'Не удалось загрузить товары.')
}

onMounted(load)
</script>

<template>
  <section class="goods" aria-labelledby="goods-heading">
    <header class="goods__header">
      <div>
        <p class="goods__eyebrow">Каталог</p>
        <h1 id="goods-heading">Товары</h1>
      </div>
    </header>

    <p v-if="loading" class="goods__state" role="status">Загружаем товары…</p>

    <div v-else-if="error" class="goods__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="isEmpty" class="goods__state">
      <h2>Товаров нет</h2>
      <p>Каталог пока пуст.</p>
    </div>

    <template v-else-if="sections">
      <div
        v-for="section in sections"
        :key="section.id"
        class="goods__group"
        :data-testid="`goods-section-${section.kind}`"
      >
        <h2>{{ kindLabels[section.kind] }}</h2>
        <p class="goods__title">{{ section.title }}</p>
        <p class="goods__description">{{ section.description }}</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.goods {
  display: grid;
  gap: var(--space-5);
}

.goods__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.goods__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.goods h1 {
  margin: 0;
}

.goods__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.goods__state h2 {
  margin: 0 0 var(--space-2);
}

.goods__state p {
  margin: 0;
}

.goods__group {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.goods__group h2 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text-muted);
}

.goods__title {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}

.goods__description {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.goods button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
</style>
