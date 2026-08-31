<script setup lang="ts">
import { reactive, ref } from 'vue'

import { useAuthSession } from '../composables/useAuthSession'

const auth = useAuthSession()
const credentials = reactive({ email: '', password: '' })
const submitting = ref(false)
const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
})

useHead({ title: 'Вход — AdminPanel' })

async function handleSubmit(): Promise<void> {
  submitting.value = true
  try {
    if (await auth.login(credentials)) await navigateTo('/')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="handleSubmit">
      <p class="login-card__eyebrow">AdminPanel</p>
      <h1>Вход</h1>
      <label>
        Email
        <input v-model="credentials.email" type="email" autocomplete="username" required>
      </label>
      <label>
        Пароль
        <input v-model="credentials.password" type="password" autocomplete="current-password" required>
      </label>
      <p v-if="auth.error.value" class="login-card__error" role="alert">{{ auth.error.value }}</p>
      <button type="submit" :disabled="submitting || !hydrated">
        {{ submitting ? 'Входим…' : 'Войти' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  padding: var(--space-5);
  place-items: center;
  background: var(--color-surface-subtle);
}

.login-card {
  display: grid;
  width: min(100%, 26rem);
  gap: var(--space-4);
  padding: var(--space-7);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.login-card__eyebrow {
  margin: 0;
  color: var(--color-brand);
  font-weight: var(--font-weight-bold);
}

h1 {
  margin: 0;
}

label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

input {
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

button {
  min-height: 2.75rem;
  border: 0;
  border-radius: var(--radius-md);
  color: white;
  background: var(--color-primary);
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.login-card__error {
  margin: 0;
  color: var(--color-danger);
}
</style>