<script setup lang="ts">
import OrdersListView from '../../orders/OrdersListView.vue'
import { useOrdersData } from '../../orders/orders-data-provider'

useHead({ title: 'Заказы — AdminPanel' })
const auth = useAuthSession()
const currentUser = computed(() => auth.user.value ?? undefined)
const ordersData = useOrdersData()
</script>

<template>
  <OrdersListView :data="ordersData" :current-user="currentUser" />
</template>
