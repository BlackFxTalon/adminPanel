<script setup lang="ts">
import type { OrderDetail } from '@admin-panel/contracts'
import { onMounted, watch } from 'vue'

import { formatOrderDate, formatRub, orderStatusLabels } from './order-presentation'
import type { OrdersData } from './orders-data'
import { useLatestAsyncResource } from './use-latest-async-resource'

const props = defineProps<{ data: OrdersData, orderId: string }>()
const resource = useLatestAsyncResource<OrderDetail>(true)
const order = resource.data
const loading = resource.loading
const error = resource.error

async function load(): Promise<void> {
  await resource.load(
    () => props.data.detail(props.orderId),
    'Не удалось загрузить Order.',
  )
}

onMounted(load)
watch(() => props.orderId, load)
</script>

<template>
  <section class="order-detail" aria-labelledby="order-heading">
    <NuxtLink class="order-detail__back" to="/orders">← Все заказы</NuxtLink>

    <p v-if="loading" class="order-detail__state" role="status">Загружаем заказ…</p>

    <div v-else-if="error" class="order-detail__state" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">Повторить</button>
    </div>

    <template v-else-if="order">
      <header class="order-detail__header">
        <div>
          <p class="order-detail__eyebrow">{{ formatOrderDate(order.createdAt) }}</p>
          <h1 id="order-heading">Заказ {{ order.number }}</h1>
        </div>
        <span class="order-detail__status">{{ orderStatusLabels[order.status] }}</span>
      </header>

      <dl class="order-detail__summary">
        <div><dt>Контрагент</dt><dd>{{ order.contragent.label }}</dd></div>
        <div><dt>Ответственный</dt><dd>{{ order.responsibleUser.name }}</dd></div>
        <div><dt>Организация</dt><dd>{{ order.organization.name }}</dd></div>
      </dl>

      <div class="order-detail__items">
        <table>
          <thead>
            <tr>
              <th scope="col">Позиция</th>
              <th scope="col">Количество</th>
              <th scope="col">Цена</th>
              <th scope="col">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in order.items" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ formatRub(item.unitPriceMinor) }}</td>
              <td>{{ formatRub(item.amountMinor) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" scope="row">Итого</th>
              <td data-testid="order-total">{{ formatRub(order.totalMinor) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.order-detail {
  display: grid;
  gap: var(--space-5);
}

.order-detail__back {
  width: fit-content;
}

.order-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.order-detail__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.order-detail h1,
.order-detail dd {
  margin: 0;
}

.order-detail__status {
  padding: var(--space-2) var(--space-3);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.order-detail__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.order-detail__summary div,
.order-detail__state {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.order-detail dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.order-detail__items {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.order-detail table {
  width: 100%;
  min-width: 42rem;
  border-collapse: collapse;
}

.order-detail th,
.order-detail td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.order-detail tfoot th,
.order-detail tfoot td {
  border-bottom: 0;
  font-weight: var(--font-weight-bold);
}

.order-detail button {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

@media (max-width: 47.99rem) {
  .order-detail__summary {
    grid-template-columns: 1fr;
  }
}
</style>
