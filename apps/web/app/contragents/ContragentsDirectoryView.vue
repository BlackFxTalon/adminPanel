<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useLatestAsyncResource } from '../orders/use-latest-async-resource'
import type { ContragentDirectoryEntry, ContragentDirectoryPage, ContragentDirectoryQuery, ContragentKind, ContragentsData } from './contragents-data'

const props = defineProps<{ data: ContragentsData }>()
const resource = useLatestAsyncResource<ContragentDirectoryPage>(true)
const result = resource.data
const loading = resource.loading
const error = resource.error

const search = ref('')
const kind = ref<ContragentKind | ''>('')
const page = ref(1)
const pageSize = 10

const kindOptions: readonly { value: ContragentKind | '', label: string }[] = [
  { value: '', label: 'Все типы' },
  { value: 'company', label: 'Компании' },
  { value: 'contact', label: 'Контакты' },
]
const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / pageSize)))

function query(): ContragentDirectoryQuery {
  return {
    page: page.value,
    pageSize,
    search: search.value.trim() || undefined,
    kind: kind.value || undefined,
  }
}

async function load(): Promise<void> {
  await resource.load(() => props.data.directory(query()), 'Не удалось загрузить контрагентов.')
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

function kindLabel(entry: ContragentDirectoryEntry): string {
  return entry.kind === 'company' ? 'Компания' : 'Контакт'
}

onMounted(load)
</script>

<template>
  <section class="contragents" aria-labelledby="contragents-heading">
    <header class="contragents__header">
      <div>
        <p class="contragents__eyebrow">Справочник</p>
        <h1 id="contragents-heading">Контрагенты</h1>
      </div>
    </header>

    <div class="contragents__controls">
      <form class="contragents__search" role="search" @submit.prevent="applyQuery">
        <label>
          <span>Поиск</span>
          <input v-model="search" aria-label="Поиск контрагентов" type="search" placeholder="Название, телефон, почта, компания">
        </label>
        <button type="submit">Найти</button>
      </form>

      <label>
        <span>Тип</span>
        <select v-model="kind" aria-label="Фильтр по типу контрагента" @change="applyQuery">
          <option v-for="option in kindOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="contragents__state" role="status">Загружаем контрагентов…</p>

    <div v-else-if="error" class="contragents__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="contragents__state">
      <h2>Контрагенты не найдены</h2>
      <p>Измените параметры поиска или фильтры.</p>
    </div>

    <template v-else-if="result">
      <div class="contragents__table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Тип</th>
              <th scope="col">Название</th>
              <th scope="col">Телефон</th>
              <th scope="col">Эл. почта</th>
              <th scope="col">Компания</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in result.items" :key="entry.id">
              <td><span class="contragents__kind">{{ kindLabel(entry) }}</span></td>
              <td>{{ entry.displayName }}</td>
              <td>{{ entry.phone ?? '—' }}</td>
              <td>{{ entry.email ?? '—' }}</td>
              <td>{{ entry.companyName ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="contragents__pagination" aria-label="Пагинация контрагентов">
        <button type="button" :disabled="page <= 1" @click="previousPage">Назад</button>
        <span>Страница {{ page }} из {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="nextPage">Вперёд</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.contragents {
  display: grid;
  gap: var(--space-6);
}

.contragents__header,
.contragents__controls,
.contragents__pagination {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.contragents__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.contragents h1 {
  margin: 0;
}

.contragents__controls {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.contragents__controls label,
.contragents__search {
  display: grid;
  gap: var(--space-2);
}

.contragents__search {
  grid-template-columns: minmax(14rem, 1fr) auto;
  align-items: end;
}

.contragents input,
.contragents select,
.contragents button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.contragents button {
  cursor: pointer;
}

.contragents button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.contragents__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.contragents__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.contragents table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

.contragents th,
.contragents td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.contragents th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.contragents__kind {
  display: inline-flex;
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

@media (max-width: 47.99rem) {
  .contragents__controls,
  .contragents__search {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .contragents__controls > *,
  .contragents input,
  .contragents select {
    width: 100%;
  }
}
</style>
