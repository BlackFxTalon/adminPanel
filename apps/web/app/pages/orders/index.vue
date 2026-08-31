<script setup lang="ts">
import OrdersListView from '../../orders/OrdersListView.vue'
import { ordersData } from '../../orders/orders-data-provider'

useHead({ title: 'Заказы — AdminPanel' })
</script>

<template>
  <OrdersListView :data="ordersData" />
</template>
