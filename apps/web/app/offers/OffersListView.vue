<script setup lang="ts">
import type { OfferSummary, OffersPage, OffersQuery } from '@admin-panel/contracts'
import { computed, onMounted, ref } from 'vue'

import { formatOrderDate, formatRub } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'
import type { OffersData } from './offers-data'

const props = defineProps<{ data: OffersData }>()
const resource = useLatestAsyncResource<OffersPage>(true)
const result = resource.data
const loading = resource.loading
const error = resource.error

const search = ref('')
const contragentId = ref('')
const page = ref(1)
const pageSize = 10

const sortOptions = [
  { value: 'newest', label: 'Сначала новые', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'number', label: 'По номеру', sortBy: 'number', sortDirection: 'asc' },
  { value: 'ordersTotal', label: 'По связанным заказам', sortBy: 'ordersTotalMinor', sortDirection: 'desc' },
] as const satisfies readonly {
  value: string
  label: string
  sortBy: OffersQuery['sortBy']
  sortDirection: OffersQuery['sortDirection']
}[]
type SortSelection = typeof sortOptions[number]['value']
const selectedSort = ref<SortSelection>('newest')

const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / pageSize)))
const knownContragents = computed(() => result.value?.filterOptions.contragents ?? [])

function contragentLabel(offer: OfferSummary): string {
  return offer.contragent?.label ?? '—'
}

function query(): OffersQuery {
  const selected = sortOptions.find(option => option.value === selectedSort.value) ?? sortOptions[0]
  return {
    page: page.value,
    pageSize,
    search: search.value.trim() || undefined,
    contragentId: contragentId.value || undefined,
    sortBy: selected.sortBy,
    sortDirection: selected.sortDirection,
  }
}

async function load(): Promise<void> {
  await resource.load(() => props.data.list(query()), 'Не удалось загрузить предложения.')
}

function applyQuery(): void {
  page.value = 1
  void load()
}

function previousPage(): void {
  if (page.value <= 1) return
  page.value -= 1
  void load()
}

function nextPage(): void {
  if (page.value >= totalPages.value) return
  page.value += 1
  void load()
}

onMounted(load)
</script>

<template>
  <section class="offers-list" aria-labelledby="offers-heading">
    <header class="offers-list__header">
      <div>
        <p class="offers-list__eyebrow">Финансы</p>
        <h1 id="offers-heading">Предложения</h1>
      </div>
    </header>

    <div class="offers-list__controls">
      <form class="offers-list__search" role="search" @submit.prevent="applyQuery">
        <label>
          <span>Поиск</span>
          <input v-model="search" aria-label="Поиск предложений" type="search" placeholder="Номер, название, контрагент">
        </label>
        <button type="submit">Найти</button>
      </form>

      <label>
        <span>Контрагент</span>
        <select v-model="contragentId" aria-label="Фильтр по контрагенту" @change="applyQuery">
          <option value="">Все контрагенты</option>
          <option v-for="contragent in knownContragents" :key="contragent.id" :value="contragent.id">
            {{ contragent.label }}
          </option>
        </select>
      </label>

      <label>
        <span>Сортировка</span>
        <select v-model="selectedSort" aria-label="Сортировка предложений" @change="applyQuery">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="offers-list__state" role="status">Загружаем предложения…</p>

    <div v-else-if="error" class="offers-list__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="offers-list__state">
      <h2>Предложения не найдены</h2>
      <p>Измените параметры поиска или фильтры.</p>
    </div>

    <template v-else-if="result">
      <div class="offers-list__table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Номер</th>
              <th scope="col">Название</th>
              <th scope="col">Контрагент</th>
              <th scope="col">Заказы</th>
              <th scope="col">Сумма заказов</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="offer in result.items" :key="offer.id">
              <td>{{ formatOrderDate(offer.createdAt) }}</td>
              <td>{{ offer.number }}</td>
              <td>{{ offer.title }}</td>
              <td>{{ contragentLabel(offer) }}</td>
              <td data-testid="offer-orders-count">{{ offer.ordersCount }}</td>
              <td data-testid="offer-orders-total">{{ formatRub(offer.ordersTotalMinor) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="offers-list__pagination" aria-label="Пагинация предложений">
        <button type="button" :disabled="page <= 1" @click="previousPage">Назад</button>
        <span>Страница {{ page }} из {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="nextPage">Вперёд</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.offers-list {
  display: grid;
  gap: var(--space-6);
}

.offers-list__header,
.offers-list__controls,
.offers-list__pagination {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.offers-list__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.offers-list h1 {
  margin: 0;
}

.offers-list__controls {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.offers-list__controls label,
.offers-list__search {
  display: grid;
  gap: var(--space-2);
}

.offers-list__search {
  grid-template-columns: minmax(14rem, 1fr) auto;
  align-items: end;
}

.offers-list input,
.offers-list select,
.offers-list button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.offers-list button {
  cursor: pointer;
}

.offers-list button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.offers-list__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.offers-list__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.offers-list table {
  width: 100%;
  min-width: 56rem;
  border-collapse: collapse;
}

.offers-list th,
.offers-list td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.offers-list th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

@media (max-width: 47.99rem) {
  .offers-list__controls,
  .offers-list__search {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .offers-list__controls > *,
  .offers-list input,
  .offers-list select {
    width: 100%;
  }
}
</style>
