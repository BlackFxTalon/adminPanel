<script setup lang="ts">
import GoodsView from '../../goods/GoodsView.vue'
import { createMockGoodsData } from '../../goods/mock-goods-data'

useHead({ title: 'Товары — AdminPanel' })
const goodsData = createMockGoodsData()
</script>

<template>
  <GoodsView :data="goodsData" />
</template>
