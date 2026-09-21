<script setup lang="ts">
import OffersListView from '../../offers/OffersListView.vue'
import { useOffersData } from '../../offers/offers-data-provider'

useHead({ title: 'Предложения — AdminPanel' })
const offersData = useOffersData()
</script>

<template>
  <OffersListView :data="offersData" />
</template>
