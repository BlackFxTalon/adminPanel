<script setup lang="ts">
throw createError({ statusCode: 404, statusMessage: 'Страница не найдена', fatal: true })
</script>

<template>
  <section class="not-found">
    <h1>Страница не найдена</h1>
    <p>Проверьте адрес или вернитесь к списку разделов.</p>
  </section>
</template>
