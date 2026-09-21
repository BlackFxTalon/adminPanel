<script setup lang="ts">
import type { AuthenticatedUser, TaskDetail, TaskStatus, TasksPage, TasksQuery } from '@admin-panel/contracts'
import { taskPriorityLabels, taskStatusLabels } from '@admin-panel/contracts'
import { computed, onMounted, ref } from 'vue'

import { formatOrderDate } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'
import { useOverlayLifecycle } from '../overlays/overlay-context'
import type { TasksData } from './tasks-data'

const props = defineProps<{ data: TasksData, currentUser?: AuthenticatedUser }>()
const overlayLifecycle = props.currentUser ? useOverlayLifecycle() : undefined

const resource = useLatestAsyncResource<TasksPage>(true)
const result = resource.data
const loading = resource.loading
const error = resource.error
const search = ref('')
const status = ref<TaskStatus | ''>('')
const assigneeId = ref('')
const mine = ref(false)
const page = ref(1)
const pageSize = 10

const sortOptions = [
  { value: 'newest', label: 'Сначала новые', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'title', label: 'По названию', sortBy: 'title', sortDirection: 'asc' },
  { value: 'number', label: 'По номеру', sortBy: 'number', sortDirection: 'asc' },
] as const satisfies readonly {
  value: string
  label: string
  sortBy: TasksQuery['sortBy']
  sortDirection: TasksQuery['sortDirection']
}[]
type SortSelection = typeof sortOptions[number]['value']
const selectedSort = ref<SortSelection>('newest')

const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / pageSize)))
const statusOptions = Object.entries(taskStatusLabels) as [TaskStatus, string][]

function query(): TasksQuery {
  const selected = sortOptions.find(option => option.value === selectedSort.value) ?? sortOptions[0]
  return {
    page: page.value,
    pageSize,
    search: search.value.trim() || undefined,
    status: status.value || undefined,
    assigneeId: assigneeId.value || undefined,
    mine: mine.value,
    sortBy: selected.sortBy,
    sortDirection: selected.sortDirection,
  }
}

async function load(): Promise<void> {
  await resource.load(() => props.data.list(query()), 'Не удалось загрузить задачи.')
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

function acceptCreated(_created: TaskDetail): void {
  search.value = ''
  status.value = ''
  assigneeId.value = ''
  mine.value = false
  selectedSort.value = 'newest'
  page.value = 1
  void load()
}

function openCreateTask(): void {
  if (!overlayLifecycle || !props.currentUser) return
  overlayLifecycle.open('createTask', {
    title: 'Новая задача',
    data: props.data,
    currentUser: props.currentUser,
    onCreated: acceptCreated,
  })
}

onMounted(load)
</script>

<template>
  <section class="tasks-list" aria-labelledby="tasks-heading">
    <header class="tasks-list__header">
      <div>
        <p class="tasks-list__eyebrow">Организация</p>
        <h1 id="tasks-heading">Задачи</h1>
      </div>
      <button
        v-if="currentUser"
        type="button"
        aria-label="Создать задачу"
        @click="openCreateTask"
      >
        Создать задачу
      </button>
    </header>

    <div class="tasks-list__controls">
      <form class="tasks-list__search" role="search" @submit.prevent="applyQuery">
        <label>
          <span>Поиск</span>
          <input v-model="search" aria-label="Поиск задач" type="search" placeholder="Номер, название, описание">
        </label>
        <button type="submit">Найти</button>
      </form>

      <label>
        <span>Статус</span>
        <select v-model="status" aria-label="Фильтр по статусу задачи" @change="applyQuery">
          <option value="">Все статусы</option>
          <option v-for="([value, label]) in statusOptions" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>

      <label>
        <span>Исполнитель</span>
        <select v-model="assigneeId" aria-label="Фильтр по исполнителю" @change="applyQuery">
          <option value="">Все исполнители</option>
          <option v-for="candidate in result?.filterOptions.assignees ?? []" :key="candidate.id" :value="candidate.id">
            {{ candidate.name }}
          </option>
        </select>
      </label>

      <label class="tasks-list__mine">
        <input v-model="mine" aria-label="Только мои задачи" type="checkbox" @change="applyQuery">
        <span>Только мои</span>
      </label>

      <label>
        <span>Сортировка</span>
        <select v-model="selectedSort" aria-label="Сортировка задач" @change="applyQuery">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="tasks-list__state" role="status">Загружаем задачи…</p>

    <div v-else-if="error" class="tasks-list__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="tasks-list__state">
      <h2>Задачи не найдены</h2>
      <p>Измените параметры поиска или фильтры.</p>
    </div>

    <template v-else-if="result">
      <div class="tasks-list__table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Название</th>
              <th scope="col">Статус</th>
              <th scope="col">Приоритет</th>
              <th scope="col">Исполнитель</th>
              <th scope="col">Контрагент</th>
              <th scope="col">Заказ</th>
              <th scope="col">Создана</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in result.items" :key="task.id">
              <td>
                {{ task.title }}
                <span data-testid="task-number">{{ task.number }}</span>
              </td>
              <td><span class="tasks-list__status">{{ taskStatusLabels[task.status] }}</span></td>
              <td>{{ taskPriorityLabels[task.priority] }}</td>
              <td>{{ task.assignee.name }}</td>
              <td>{{ task.contragent?.label ?? '—' }}</td>
              <td>{{ task.order?.label ?? '—' }}</td>
              <td>{{ formatOrderDate(task.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="tasks-list__pagination" aria-label="Пагинация задач">
        <button type="button" :disabled="page <= 1" @click="previousPage">Назад</button>
        <span>Страница {{ page }} из {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="nextPage">Вперёд</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.tasks-list {
  display: grid;
  gap: var(--space-6);
}

.tasks-list__header,
.tasks-list__controls,
.tasks-list__pagination {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.tasks-list__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.tasks-list h1 {
  margin: 0;
}

.tasks-list__controls {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.tasks-list__controls label,
.tasks-list__search {
  display: grid;
  gap: var(--space-2);
}

.tasks-list__mine {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tasks-list__search {
  grid-template-columns: minmax(14rem, 1fr) auto;
  align-items: end;
}

.tasks-list input,
.tasks-list select,
.tasks-list button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.tasks-list__mine input {
  min-height: auto;
  width: 1.25rem;
}

.tasks-list button {
  cursor: pointer;
}

.tasks-list button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.tasks-list__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.tasks-list__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.tasks-list table {
  width: 100%;
  min-width: 60rem;
  border-collapse: collapse;
}

.tasks-list th,
.tasks-list td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.tasks-list th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.tasks-list__status {
  display: inline-flex;
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

.tasks-list [data-testid="task-number"] {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

@media (max-width: 47.99rem) {
  .tasks-list__controls,
  .tasks-list__search {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .tasks-list__controls > *,
  .tasks-list input,
  .tasks-list select {
    width: 100%;
  }
}
</style>
