<script setup lang="ts">
import OrderDetailView from '../../orders/OrderDetailView.vue'
import { useOrdersData } from '../../orders/orders-data-provider'

const route = useRoute()
const orderId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] ?? '' : String(route.params.id))
const ordersData = useOrdersData()

useHead({ title: 'Детали заказа — AdminPanel' })
</script>

<template>
  <OrderDetailView :data="ordersData" :order-id="orderId" />
</template>
