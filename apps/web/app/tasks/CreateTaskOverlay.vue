<script setup lang="ts">
import type { CreateTaskInput, TaskCreationOptions, TaskPriority } from '@admin-panel/contracts'
import { taskPriorityLabels } from '@admin-panel/contracts'
import { computed, nextTick, onMounted, ref } from 'vue'

import type { CreateTaskOverlayPayload } from './create-task-overlay'
import { TasksDataError } from './tasks-data'

const props = defineProps<{
  headingId: string
  payload: CreateTaskOverlayPayload
}>()
const emit = defineEmits<{ close: [], dirtyChange: [dirty: boolean] }>()

const options = ref<TaskCreationOptions | null>(null)
const optionsError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const fieldErrors = ref<Readonly<Record<string, readonly string[]>>>({})
const saving = ref(false)
const title = ref('')
const description = ref('')
const priority = ref<TaskPriority>('medium')
const assigneeId = ref('')
const contragentId = ref('')
const orderId = ref('')
const formElement = ref<HTMLFormElement | null>(null)

const initialSnapshot = JSON.stringify({ title: '', description: '', priority: 'medium', assigneeId: '', contragentId: '', orderId: '' })

function draftSnapshot(): string {
  return JSON.stringify({
    title: title.value,
    description: description.value,
    priority: priority.value,
    assigneeId: assigneeId.value,
    contragentId: contragentId.value,
    orderId: orderId.value,
  })
}

function markDirty(): void {
  emit('dirtyChange', draftSnapshot() !== initialSnapshot)
}

const assigneeOptions = computed(() => options.value?.assignees ?? [])

function errorFor(field: string): string | undefined {
  return fieldErrors.value[field]?.[0]
}

function errorId(field: string): string {
  return `create-task-error-${field}`
}

function createInput(): CreateTaskInput {
  return {
    title: title.value,
    ...(description.value.trim() ? { description: description.value.trim() } : {}),
    priority: priority.value,
    assigneeId: assigneeId.value || props.payload.currentUser.id,
    ...(contragentId.value ? { contragentId: contragentId.value } : {}),
    ...(orderId.value ? { orderId: orderId.value } : {}),
  }
}

function validateDraft(): boolean {
  const errors: Record<string, string[]> = {}
  if (!title.value.trim()) errors.title = ['Введите название задачи.']
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function focusFirstInvalid(): Promise<void> {
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function loadOptions(): Promise<void> {
  optionsError.value = null
  try {
    options.value = await props.payload.data.creationOptions()
    await nextTick()
    formElement.value?.querySelector<HTMLElement>('[data-overlay-initial-focus]')?.focus()
  } catch (caught) {
    optionsError.value = caught instanceof Error ? caught.message : 'Не удалось загрузить данные для создания задачи.'
  }
}

async function submit(): Promise<void> {
  saveError.value = null
  fieldErrors.value = {}
  if (!validateDraft()) {
    await focusFirstInvalid()
    return
  }
  saving.value = true
  try {
    const created = await props.payload.data.create(createInput())
    props.payload.onCreated(created)
    emit('dirtyChange', false)
    emit('close')
  } catch (caught) {
    saveError.value = caught instanceof Error ? caught.message : 'Не удалось сохранить задачу.'
    if (caught instanceof TasksDataError && caught.fieldErrors) {
      fieldErrors.value = caught.fieldErrors
      await focusFirstInvalid()
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadOptions)
</script>

<template>
  <form ref="formElement" class="overlay-content create-task" @submit.prevent="submit">
    <header class="overlay-content__header">
      <h2 :id="headingId" data-overlay-heading tabindex="-1">{{ payload.title }}</h2>
      <button aria-label="Закрыть" type="button" @click="$emit('close')">×</button>
    </header>

    <p v-if="!options && !optionsError" role="status">Загружаем данные…</p>
    <div v-else-if="optionsError" role="alert">
      <p>{{ optionsError }}</p>
      <button type="button" @click="loadOptions">Повторить</button>
    </div>

    <template v-else-if="options">
      <label>
        Название
        <input
          v-model="title"
          data-overlay-initial-focus
          aria-label="Название задачи"
          :aria-invalid="errorFor('title') ? 'true' : undefined"
          :aria-describedby="errorFor('title') ? errorId('title') : undefined"
          @input="markDirty"
        >
        <span v-if="errorFor('title')" :id="errorId('title')" class="create-task__field-error">{{ errorFor('title') }}</span>
      </label>

      <label>
        Описание <span>(необязательно)</span>
        <textarea v-model="description" aria-label="Описание задачи" @input="markDirty" />
      </label>

      <label>
        Приоритет
        <select v-model="priority" aria-label="Приоритет задачи" @change="markDirty">
          <option value="low">{{ taskPriorityLabels.low }}</option>
          <option value="medium">{{ taskPriorityLabels.medium }}</option>
          <option value="high">{{ taskPriorityLabels.high }}</option>
        </select>
      </label>

      <label>
        Исполнитель
        <select
          v-model="assigneeId"
          aria-label="Исполнитель задачи"
          :aria-invalid="errorFor('assigneeId') ? 'true' : undefined"
          :aria-describedby="errorFor('assigneeId') ? errorId('assigneeId') : undefined"
          @change="markDirty"
        >
          <option value="">Я ({{ payload.currentUser.name }})</option>
          <option v-for="candidate in assigneeOptions" :key="candidate.id" :value="candidate.id">
            {{ candidate.name }}
          </option>
        </select>
        <span v-if="errorFor('assigneeId')" :id="errorId('assigneeId')" class="create-task__field-error">{{ errorFor('assigneeId') }}</span>
      </label>

      <label>
        Контрагент <span>(необязательно)</span>
        <select
          v-model="contragentId"
          aria-label="Контрагент задачи"
          :aria-invalid="errorFor('contragentId') ? 'true' : undefined"
          :aria-describedby="errorFor('contragentId') ? errorId('contragentId') : undefined"
          @change="markDirty"
        >
          <option value="">Без контрагента</option>
          <option v-for="candidate in options.contragents" :key="candidate.id" :value="candidate.id">
            {{ candidate.label }}
          </option>
        </select>
        <span v-if="errorFor('contragentId')" :id="errorId('contragentId')" class="create-task__field-error">{{ errorFor('contragentId') }}</span>
      </label>

      <label>
        Заказ <span>(необязательно)</span>
        <select
          v-model="orderId"
          aria-label="Заказ задачи"
          :aria-invalid="errorFor('orderId') ? 'true' : undefined"
          :aria-describedby="errorFor('orderId') ? errorId('orderId') : undefined"
          @change="markDirty"
        >
          <option value="">Без заказа</option>
          <option v-for="candidate in options.orders" :key="candidate.id" :value="candidate.id">
            {{ candidate.label }}
          </option>
        </select>
        <span v-if="errorFor('orderId')" :id="errorId('orderId')" class="create-task__field-error">{{ errorFor('orderId') }}</span>
      </label>

      <p v-if="saveError" role="alert">{{ saveError }}</p>

      <div class="overlay-content__actions">
        <button type="button" @click="$emit('close')">Отмена</button>
        <button type="submit" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Создать задачу' }}</button>
      </div>
    </template>
  </form>
</template>

<style scoped>
.create-task {
  display: grid;
  gap: var(--space-4);
}

.create-task textarea {
  min-height: 6rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
}

.create-task select,
.create-task input,
.create-task button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.create-task__field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
