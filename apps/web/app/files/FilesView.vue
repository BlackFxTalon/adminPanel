<script setup lang="ts">
import type { FilesBoardData, FileEntry } from './files-data'
import { computed, onMounted } from 'vue'

import { formatOrderDate } from '../orders/order-presentation'
import { useLatestAsyncResource } from '../orders/use-latest-async-resource'

const props = defineProps<{ data: FilesBoardData }>()
const resource = useLatestAsyncResource<readonly FileEntry[]>(true)
const documents = resource.data
const loading = resource.loading
const error = resource.error

const isEmpty = computed(() => !loading.value && !error.value && (documents.value?.length ?? 0) === 0)

async function load(): Promise<void> {
  await resource.load(() => props.data.documents(), 'Не удалось загрузить файлы.')
}

onMounted(load)
</script>

<template>
  <section class="files" aria-labelledby="files-heading">
    <header class="files__header">
      <div>
        <p class="files__eyebrow">Документооборот</p>
        <h1 id="files-heading">Файлы</h1>
      </div>
    </header>

    <p v-if="loading" class="files__state" role="status">Загружаем файлы…</p>

    <div v-else-if="error" class="files__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <div v-else-if="isEmpty" class="files__state">
      <h2>Файлов нет</h2>
      <p>Загруженные документы появятся в списке.</p>
    </div>

    <div v-else-if="documents" class="files__table-wrapper">
      <table>
        <thead>
          <tr>
            <th scope="col">Название</th>
            <th scope="col">Дата</th>
            <th scope="col">Контрагент</th>
            <th scope="col">Организация</th>
            <th scope="col">Тип файла</th>
            <th scope="col">Ответственный</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="document in documents" :key="document.id">
            <td>{{ document.name }}</td>
            <td>{{ formatOrderDate(document.updatedAt) }}</td>
            <td>{{ document.contragent }}</td>
            <td>{{ document.organization }}</td>
            <td>{{ document.fileType }}</td>
            <td>{{ document.owner }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.files {
  display: grid;
  gap: var(--space-5);
}

.files__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.files__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-accent);
  font-weight: 700;
}

.files h1 {
  margin: 0;
}

.files__state {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.files__state h2 {
  margin: 0 0 var(--space-2);
}

.files__state p {
  margin: 0;
}

.files__table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.files table {
  width: 100%;
  min-width: 56rem;
  border-collapse: collapse;
}

.files th,
.files td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.files th {
  color: var(--color-text-muted);
  font-size: .875rem;
}

.files button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
</style>
