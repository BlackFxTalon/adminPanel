<script setup lang="ts">
import type { CreateOrderInput, OrderCreationOptions } from '@admin-panel/contracts'
import { computed, nextTick, onMounted, ref } from 'vue'

import type { CreateOrderOverlayPayload } from './create-order-overlay'
import { validateCreateOrderInput } from './create-order-validation'
import { formatRub, parseRubToMinor } from './order-presentation'
import { OrdersDataError } from './orders-data'

interface DraftOrderItem {
  readonly clientId: string
  name: string
  quantity: string
  unitPriceRub: string
  characteristics: string
  weightGrams: string
  volumeCubicCentimeters: string
}

const props = defineProps<{
  headingId: string
  payload: CreateOrderOverlayPayload
}>()
const emit = defineEmits<{ close: [], dirtyChange: [dirty: boolean] }>()

const options = ref<OrderCreationOptions | null>(null)
const optionsError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const fieldErrors = ref<Readonly<Record<string, readonly string[]>>>({})
const saving = ref(false)
const contragentId = ref('')
const offerId = ref('')
const items = ref<DraftOrderItem[]>([draftItem(1)])
const formElement = ref<HTMLFormElement | null>(null)
let nextItemSequence = 1

function draftItem(sequence: number): DraftOrderItem {
  return {
    clientId: `draft-item-${sequence}`,
    name: '',
    quantity: '1',
    unitPriceRub: '0',
    characteristics: '',
    weightGrams: '',
    volumeCubicCentimeters: '',
  }
}

function itemAmountMinor(item: DraftOrderItem): number {
  const quantity = Number(item.quantity)
  const unitPriceMinor = parseRubToMinor(item.unitPriceRub)
  return Number.isInteger(quantity) && quantity > 0 && unitPriceMinor !== null
    ? quantity * unitPriceMinor
    : 0
}

const totalMinor = computed(() => items.value.reduce((total, item) => total + itemAmountMinor(item), 0))
const initialSnapshot = JSON.stringify({ contragentId: '', offerId: '', items: items.value })

function draftSnapshot(): string {
  return JSON.stringify({ contragentId: contragentId.value, offerId: offerId.value, items: items.value })
}

function markDirty(): void {
  emit('dirtyChange', draftSnapshot() !== initialSnapshot)
}

function addItem(): void {
  items.value.push(draftItem(++nextItemSequence))
  markDirty()
}

function removeItem(clientId: string): void {
  if (items.value.length <= 1) return
  items.value = items.value.filter(item => item.clientId !== clientId)
  fieldErrors.value = {}
  markDirty()
}

function errorFor(field: string): string | undefined {
  return fieldErrors.value[field]?.[0]
}

function errorId(field: string): string {
  return `create-order-error-${field.replaceAll('.', '-')}`
}

function optionalInteger(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined
}

function createInput(): CreateOrderInput {
  const mapped = items.value.map(item => ({
    clientId: item.clientId,
    name: item.name,
    quantity: Number(item.quantity),
    unitPriceMinor: parseRubToMinor(item.unitPriceRub) ?? -1,
    ...(item.characteristics.trim() ? { characteristics: item.characteristics.trim() } : {}),
    ...(optionalInteger(item.weightGrams) !== undefined ? { weightGrams: optionalInteger(item.weightGrams) } : {}),
    ...(optionalInteger(item.volumeCubicCentimeters) !== undefined
      ? { volumeCubicCentimeters: optionalInteger(item.volumeCubicCentimeters) }
      : {}),
  }))
  const [first, ...remaining] = mapped
  if (!first) throw new Error('Order должен содержать хотя бы одну позицию.')
  return {
    contragentId: contragentId.value,
    ...(offerId.value ? { offerId: offerId.value } : {}),
    items: [first, ...remaining],
  }
}

function validateDraft(): boolean {
  if (!options.value) return false
  const errors = validateCreateOrderInput(createInput(), options.value)
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
    optionsError.value = caught instanceof Error ? caught.message : 'Не удалось загрузить данные для создания заказа.'
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
    saveError.value = caught instanceof Error ? caught.message : 'Не удалось сохранить заказ.'
    if (caught instanceof OrdersDataError && caught.fieldErrors) {
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
  <form ref="formElement" class="overlay-content create-order" @submit.prevent="submit">
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
      <dl class="create-order__context">
        <div><dt>Организация</dt><dd>{{ payload.currentUser.organization.name }}</dd></div>
        <div><dt>Ответственный</dt><dd>{{ payload.currentUser.name }}</dd></div>
      </dl>

      <label>
        Контрагент
        <select
          v-model="contragentId"
          data-overlay-initial-focus
          aria-label="Контрагент"
          :aria-invalid="errorFor('contragentId') ? 'true' : undefined"
          :aria-describedby="errorFor('contragentId') ? 'contragent-error' : undefined"
          @change="markDirty"
        >
          <option value="">Выберите контрагента</option>
          <option v-for="contragent in options.contragents" :key="contragent.id" :value="contragent.id">
            {{ contragent.label }}
          </option>
        </select>
        <span v-if="errorFor('contragentId')" id="contragent-error" class="create-order__field-error">{{ errorFor('contragentId') }}</span>
      </label>

      <label>
        Предложение <span>(необязательно)</span>
        <select
          v-model="offerId"
          aria-label="Предложение"
          :aria-invalid="errorFor('offerId') ? 'true' : undefined"
          :aria-describedby="errorFor('offerId') ? errorId('offerId') : undefined"
          @change="markDirty"
        >
          <option value="">Без предложения</option>
          <option v-for="offer in options.offers" :key="offer.id" :value="offer.id">{{ offer.label }}</option>
        </select>
        <span v-if="errorFor('offerId')" :id="errorId('offerId')" class="create-order__field-error">{{ errorFor('offerId') }}</span>
      </label>
      <button
        v-if="payload.onOfferHelp"
        type="button"
        aria-label="Справка о предложении"
        @click="payload.onOfferHelp"
      >
        Что такое предложение?
      </button>

      <p v-if="errorFor('items')" :id="errorId('items')" class="create-order__field-error">{{ errorFor('items') }}</p>

      <fieldset v-for="(item, index) in items" :key="item.clientId" class="create-order__item">
        <legend>Позиция {{ index + 1 }}</legend>
        <p
          v-if="errorFor(`items.${index}.clientId`)"
          :id="errorId(`items.${index}.clientId`)"
          class="create-order__field-error"
        >
          {{ errorFor(`items.${index}.clientId`) }}
        </p>
        <button
          type="button"
          :aria-label="`Удалить позицию ${index + 1}`"
          :disabled="items.length === 1"
          @click="removeItem(item.clientId)"
        >
          Удалить
        </button>
        <label>
          Название
          <input
            v-model="item.name"
            :aria-label="`Название позиции ${index + 1}`"
            :aria-invalid="errorFor(`items.${index}.name`) ? 'true' : undefined"
            :aria-describedby="errorFor(`items.${index}.name`) ? errorId(`items.${index}.name`) : undefined"
            @input="markDirty"
          >
          <span v-if="errorFor(`items.${index}.name`)" :id="errorId(`items.${index}.name`)" class="create-order__field-error">{{ errorFor(`items.${index}.name`) }}</span>
        </label>
        <label>
          Количество
          <input
            v-model="item.quantity"
            :aria-label="`Количество позиции ${index + 1}`"
            :aria-invalid="errorFor(`items.${index}.quantity`) ? 'true' : undefined"
            :aria-describedby="errorFor(`items.${index}.quantity`) ? errorId(`items.${index}.quantity`) : undefined"
            inputmode="numeric"
            @input="markDirty"
          >
          <span v-if="errorFor(`items.${index}.quantity`)" :id="errorId(`items.${index}.quantity`)" class="create-order__field-error">{{ errorFor(`items.${index}.quantity`) }}</span>
        </label>
        <label>
          Цена за единицу, ₽
          <input
            v-model="item.unitPriceRub"
            :aria-label="`Цена позиции ${index + 1}, ₽`"
            :aria-invalid="errorFor(`items.${index}.unitPriceMinor`) ? 'true' : undefined"
            :aria-describedby="errorFor(`items.${index}.unitPriceMinor`) ? errorId(`items.${index}.unitPriceMinor`) : undefined"
            inputmode="decimal"
            @input="markDirty"
          >
          <span v-if="errorFor(`items.${index}.unitPriceMinor`)" :id="errorId(`items.${index}.unitPriceMinor`)" class="create-order__field-error">{{ errorFor(`items.${index}.unitPriceMinor`) }}</span>
        </label>
        <label>
          Характеристики <span>(необязательно)</span>
          <input v-model="item.characteristics" :aria-label="`Характеристики позиции ${index + 1}`" @input="markDirty">
        </label>
        <label>
          Вес, г <span>(необязательно)</span>
          <input
            v-model="item.weightGrams"
            :aria-label="`Вес позиции ${index + 1}, г`"
            :aria-invalid="errorFor(`items.${index}.weightGrams`) ? 'true' : undefined"
            :aria-describedby="errorFor(`items.${index}.weightGrams`) ? errorId(`items.${index}.weightGrams`) : undefined"
            inputmode="numeric"
            @input="markDirty"
          >
          <span v-if="errorFor(`items.${index}.weightGrams`)" :id="errorId(`items.${index}.weightGrams`)" class="create-order__field-error">{{ errorFor(`items.${index}.weightGrams`) }}</span>
        </label>
        <label>
          Объём, см³ <span>(необязательно)</span>
          <input
            v-model="item.volumeCubicCentimeters"
            :aria-label="`Объём позиции ${index + 1}, см³`"
            :aria-invalid="errorFor(`items.${index}.volumeCubicCentimeters`) ? 'true' : undefined"
            :aria-describedby="errorFor(`items.${index}.volumeCubicCentimeters`) ? errorId(`items.${index}.volumeCubicCentimeters`) : undefined"
            inputmode="numeric"
            @input="markDirty"
          >
          <span v-if="errorFor(`items.${index}.volumeCubicCentimeters`)" :id="errorId(`items.${index}.volumeCubicCentimeters`)" class="create-order__field-error">{{ errorFor(`items.${index}.volumeCubicCentimeters`) }}</span>
        </label>
        <p :data-testid="`order-item-amount-${index + 1}`">Сумма: {{ formatRub(itemAmountMinor(item)) }}</p>
      </fieldset>

      <button type="button" aria-label="Добавить позицию" @click="addItem">Добавить позицию</button>

      <p data-testid="order-create-total"><strong>Итого: {{ formatRub(totalMinor) }}</strong></p>
      <p v-if="saveError" role="alert">{{ saveError }}</p>

      <div class="overlay-content__actions">
        <button type="button" @click="$emit('close')">Отмена</button>
        <button type="submit" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Создать заказ' }}</button>
      </div>
    </template>
  </form>
</template>

<style scoped>
.create-order {
  display: grid;
  gap: var(--space-4);
}

.create-order__context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.create-order__context div,
.create-order__item {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.create-order__context dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.create-order__context dd {
  margin: var(--space-1) 0 0;
}

.create-order__field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.create-order__item {
  display: grid;
  gap: var(--space-3);
}

.create-order select,
.create-order input,
.create-order button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 47.99rem) {
  .create-order__context { grid-template-columns: 1fr; }
}
</style>
