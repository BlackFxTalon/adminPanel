<script setup lang="ts">
import { userRoleLabels } from '@admin-panel/contracts'
import type { AuthenticatedUser } from '@admin-panel/contracts'

const props = defineProps<{ currentUser: AuthenticatedUser }>()

const isAdmin = computed(() => props.currentUser.role === 'admin')
</script>

<template>
  <section class="user-detail" aria-labelledby="user-heading">
    <header class="user-detail__header">
      <div>
        <p class="user-detail__eyebrow">Профиль</p>
        <h1 id="user-heading">{{ currentUser.name }}</h1>
      </div>
      <span class="user-detail__role" data-testid="user-role">{{ userRoleLabels[currentUser.role] }}</span>
    </header>

    <dl class="user-detail__summary">
      <div><dt>Логин (e-mail)</dt><dd data-testid="user-login">{{ currentUser.email }}</dd></div>
      <div><dt>Организация</dt><dd>{{ currentUser.organization.name }}</dd></div>
      <div><dt>Роль</dt><dd>{{ userRoleLabels[currentUser.role] }}</dd></div>
    </dl>

    <p v-if="isAdmin" class="user-detail__admin-note" data-testid="admin-note">
      Вы администратор организации: можете управлять списком пользователей в разделе «Пользователи».
    </p>
    <p v-else class="user-detail__user-note" data-testid="user-note">
      Доступ к управлению пользователями есть только у администратора организации.
    </p>
  </section>
</template>

<style scoped>
.user-detail {
  display: grid;
  gap: var(--space-5);
}

.user-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.user-detail__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.user-detail h1 {
  margin: 0;
}

.user-detail__role {
  padding: var(--space-2) var(--space-3);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.user-detail__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.user-detail__summary div {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.user-detail__summary dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.user-detail__summary dd {
  margin: var(--space-1) 0 0;
}

.user-detail__admin-note,
.user-detail__user-note {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

@media (max-width: 47.99rem) {
  .user-detail__summary { grid-template-columns: 1fr; }
}
</style>
