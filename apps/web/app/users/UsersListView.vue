<script setup lang="ts">
import type { UsersPage, UsersQuery, UserRole } from '@admin-panel/contracts'
import { userRoleLabels } from '@admin-panel/contracts'
import { computed, onMounted, ref } from 'vue'

import { useLatestAsyncResource } from '../orders/use-latest-async-resource'
import type { UsersData } from './users-data'

const props = defineProps<{ data: UsersData }>()
const resource = useLatestAsyncResource<UsersPage>(true)
const result = resource.data
const loading = resource.loading
const error = resource.error

const search = ref('')
const role = ref<UserRole | ''>('')
const page = ref(1)
const pageSize = 10

const roleOptions = Object.entries(userRoleLabels) as [UserRole, string][]
const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.total ?? 0) / pageSize)))

function query(): UsersQuery {
  return {
    page: page.value,
    pageSize,
    search: search.value.trim() || undefined,
    role: role.value || undefined,
    sortBy: 'name',
    sortDirection: 'asc',
  }
}

async function load(): Promise<void> {
  await resource.load(() => props.data.list(query()), 'Не удалось загрузить пользователей.')
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
  <section class="users-list" aria-labelledby="users-heading">
    <header class="users-list__header">
      <div>
        <p class="users-list__eyebrow">Организация</p>
        <h1 id="users-heading">Пользователи</h1>
      </div>
    </header>

    <div class="users-list__controls">
      <form class="users-list__search" role="search" @submit.prevent="applyQuery">
        <label>
          <span>Поиск</span>
          <input v-model="search" aria-label="Поиск пользователей" type="search" placeholder="Имя, эл. почта">
        </label>
        <button type="submit">Найти</button>
      </form>

      <label>
        <span>Роль</span>
        <select v-model="role" aria-label="Фильтр по роли" @change="applyQuery">
          <option value="">Все роли</option>
          <option v-for="([value, label]) in roleOptions" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="users-list__state" role="status">Загружаем пользователей…</p>

    <div v-else-if="error" class="users-list__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="users-list__state">
      <h2>Пользователи не найдены</h2>
      <p>Измените параметры поиска или фильтры.</p>
    </div>

    <template v-else-if="result">
      <div class="users-list__table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Имя</th>
              <th scope="col">Роль</th>
              <th scope="col">Организация</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in result.items" :key="user.id">
              <td>
                {{ user.name }}
                <span data-testid="user-email">{{ user.email }}</span>
              </td>
              <td><span class="users-list__role">{{ userRoleLabels[user.role] }}</span></td>
              <td>{{ user.organization.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="users-list__pagination" aria-label="Пагинация пользователей">
        <button type="button" :disabled="page <= 1" @click="previousPage">Назад</button>
        <span>Страница {{ page }} из {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="nextPage">Вперёд</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.users-list {
  display: grid;
  gap: var(--space-6);
}

.users-list__header,
.users-list__controls,
.users-list__pagination {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.users-list__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.users-list h1 {
  margin: 0;
}

.users-list__controls {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.users-list__controls label,
.users-list__search {
  display: grid;
  gap: var(--space-2);
}

.users-list__search {
  grid-template-columns: minmax(14rem, 1fr) auto;
  align-items: end;
}

.users-list input,
.users-list select,
.users-list button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.users-list button {
  cursor: pointer;
}

.users-list button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.users-list__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.users-list__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.users-list table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

.users-list th,
.users-list td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.users-list th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.users-list__role {
  display: inline-flex;
  padding: .25rem var(--space-2);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  white-space: nowrap;
}

.users-list [data-testid="user-email"] {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

@media (max-width: 47.99rem) {
  .users-list__controls,
  .users-list__search {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .users-list__controls > *,
  .users-list input,
  .users-list select {
    width: 100%;
  }
}
</style>
