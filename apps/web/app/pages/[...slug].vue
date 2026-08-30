<script setup lang="ts">
import { primaryRoutes } from '../navigation/route-intent'

const route = useRoute()
const currentPath = computed(() => `/${String(route.params.slug)}`)
const destination = computed(() => primaryRoutes.find(item => item.to === currentPath.value))

if (!destination.value) {
  throw createError({ statusCode: 404, statusMessage: 'Страница не найдена' })
}

useHead({
  title: () => `${destination.value?.label ?? 'Раздел'} — AdminPanel`,
})
</script>

<template>
  <section class="migration-placeholder">
    <p class="migration-placeholder__eyebrow">Маршрут сохранён</p>
    <h1>{{ destination?.label }}</h1>
    <p>Раздел будет перенесён из Astro в одном из следующих вертикальных срезов.</p>
  </section>
</template>
