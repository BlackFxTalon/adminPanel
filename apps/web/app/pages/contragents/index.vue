<script setup lang="ts">
import ContragentsDirectoryView from '../../contragents/ContragentsDirectoryView.vue'
import { useContragentsData } from '../../contragents/contragents-data-provider'

useHead({ title: 'Контрагенты — AdminPanel' })
const contragentsData = useContragentsData()
</script>

<template>
  <ContragentsDirectoryView :data="contragentsData" />
</template>
