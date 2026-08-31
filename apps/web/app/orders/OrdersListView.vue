<script setup lang="ts">
import type { OrderStatus, OrdersPage, OrdersQuery } from '@admin-panel/contracts'
import { computed, onMounted, ref } from 'vue'

import { formatOrderDate, formatRub, orderStatusLabels } from './order-presentation'
import type { OrdersData } from './orders-data'
import { useLatestAsyncResource } from './use-latest-async-resource'

const props = defineProps<{ data: OrdersData }>()

const resource = useLatestAsyncResource<OrdersPage>(true)
const result = resource.data
const loading = resource.loading
const error = resource.error
const search = ref('')
const status = ref<OrderStatus | ''>('')
const contragentId = ref('')
const sortOptions = [
  { value: 'newest', label: 'Сначала новые', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'oldest', label: 'Сначала старые', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'number', label: 'По номеру', sortBy: 'number', sortDirection: 'asc' },
  { value: 'total', label: 'По сумме', sortBy: 'totalMinor', sortDirection: 'desc' },
] as const satisfies readonly {
  value: string
  label: string
  sortBy: OrdersQuery['sortBy']
  sortDirection: OrdersQuery['sortDirection']
}[]
type SortSelection = typeof sortOptions[number]['value']
const selectedSort = ref<SortSelection>('newest')
const page = ref(1)
const pageSize = 10
const knownContragents = ref(new Map<string, string>())

const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / pageSize)))
const statusOptions = Object.entries(orderStatusLabels) as [OrderStatus, string][]

function query(): OrdersQuery {
  const selected = sortOptions.find(option => option.value === selectedSort.value) ?? sortOptions[0]
  return {
    page: page.value,
    pageSize,
    search: search.value.trim() || undefined,
    status: status.value || undefined,
    contragentId: contragentId.value || undefined,
    sortBy: selected.sortBy,
    sortDirection: selected.sortDirection,
  }
}

async function load(): Promise<void> {
  const next = await resource.load(
    () => props.data.list(query()),
    'Не удалось загрузить заказы.',
  )
  if (next) {
    for (const contragent of next.filterOptions.contragents) {
      knownContragents.value.set(contragent.id, contragent.label)
    }
  }
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
  <section class="orders-list" aria-labelledby="orders-heading">
    <header class="orders-list__header">
      <div>
        <p class="orders-list__eyebrow">Рабочее пространство</p>
        <h1 id="orders-heading">Заказы</h1>
      </div>
    </header>

    <div class="orders-list__controls">
      <form class="orders-list__search" role="search" @submit.prevent="applyQuery">
        <label>
          <span>Поиск</span>
          <input v-model="search" aria-label="Поиск заказов" type="search" placeholder="Номер, контрагент, позиция">
        </label>
        <button type="submit">Найти</button>
      </form>

      <label>
        <span>Статус</span>
        <select v-model="status" aria-label="Фильтр по статусу" @change="applyQuery">
          <option value="">Все статусы</option>
          <option v-for="([value, label]) in statusOptions" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>

      <label>
        <span>Контрагент</span>
        <select v-model="contragentId" aria-label="Фильтр по контрагенту" @change="applyQuery">
          <option value="">Все контрагенты</option>
          <option v-for="([id, label]) in knownContragents" :key="id" :value="id">{{ label }}</option>
        </select>
      </label>

      <label>
        <span>Сортировка</span>
        <select v-model="selectedSort" aria-label="Сортировка заказов" @change="applyQuery">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="orders-list__state" role="status">Загружаем заказы…</p>

    <div v-else-if="error" class="orders-list__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="orders-list__state">
      <h2>Заказы не найдены</h2>
      <p>Измените параметры поиска или фильтры.</p>
    </div>

    <template v-else-if="result">
      <div class="orders-list__table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Номер</th>
              <th scope="col">Контрагент</th>
              <th scope="col">Сумма</th>
              <th scope="col">Статус</th>
              <th scope="col">Ответственный</th>
              <th scope="col">Организация</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in result.items" :key="order.id">
              <td>{{ formatOrderDate(order.createdAt) }}</td>
              <td><NuxtLink :to="`/orders/${order.id}`">{{ order.number }}</NuxtLink></td>
              <td>{{ order.contragent.label }}</td>
              <td>{{ formatRub(order.totalMinor) }}</td>
              <td><span class="orders-list__status">{{ orderStatusLabels[order.status] }}</span></td>
              <td>{{ order.responsibleUser.name }}</td>
              <td>{{ order.organization.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="orders-list__pagination" aria-label="Пагинация заказов">
        <button type="button" :disabled="page <= 1" @click="previousPage">Назад</button>
        <span>Страница {{ page }} из {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="nextPage">Вперёд</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.orders-list {
  display: grid;
  gap: var(--space-6);
}

.orders-list__header,
.orders-list__controls,
.orders-list__pagination {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.orders-list__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.orders-list h1 {
  margin: 0;
}

.orders-list__controls {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.orders-list__controls label,
.orders-list__search {
  display: grid;
  gap: var(--space-2);
}

.orders-list__search {
  grid-template-columns: minmax(14rem, 1fr) auto;
  align-items: end;
}

.orders-list input,
.orders-list select,
.orders-list button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.orders-list button {
  cursor: pointer;
}

.orders-list button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.orders-list__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.orders-list__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.orders-list table {
  width: 100%;
  min-width: 64rem;
  border-collapse: collapse;
}

.orders-list th,
.orders-list td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.orders-list th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.orders-list__status {
  display: inline-flex;
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

@media (max-width: 47.99rem) {
  .orders-list__controls,
  .orders-list__search {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .orders-list__controls > *,
  .orders-list input,
  .orders-list select {
    width: 100%;
  }
}
</style>
