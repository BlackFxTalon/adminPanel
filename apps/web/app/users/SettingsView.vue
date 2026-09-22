<script setup lang="ts">
import { userRoleLabels } from '@admin-panel/contracts'
import type { AuthenticatedUser } from '@admin-panel/contracts'
import { computed } from 'vue'

import { useOverlayLifecycle } from '../overlays/overlay-context'

const props = defineProps<{ currentUser: AuthenticatedUser }>()
const overlayLifecycle = useOverlayLifecycle()

const displayName = computed(() => `${props.currentUser.name} · ${props.currentUser.email}`)

function openProfileSettings(): void {
  overlayLifecycle.open('form', {
    title: 'Настройки профиля',
    initialValue: props.currentUser.name,
  })
}

function openOrganizationSettings(): void {
  overlayLifecycle.open('information', {
    title: 'Организация',
    message: `Организация «${props.currentUser.organization.name}» управляется администратором. Изменение названия будет доступно в следующем доменном срезе.`,
  })
}
</script>

<template>
  <section class="settings" aria-labelledby="settings-heading">
    <header class="settings__header">
      <div>
        <p class="settings__eyebrow">{{ displayName }}</p>
        <h1 id="settings-heading">Настройки</h1>
      </div>
    </header>

    <div class="settings__group">
      <h2>Профиль</h2>
      <dl class="settings__summary">
        <div><dt>ФИО</dt><dd data-testid="settings-name">{{ currentUser.name }}</dd></div>
        <div><dt>Эл. почта</dt><dd>{{ currentUser.email }}</dd></div>
        <div><dt>Роль</dt><dd>{{ userRoleLabels[currentUser.role] }}</dd></div>
      </dl>
      <button type="button" data-testid="edit-profile" @click="openProfileSettings">Изменить</button>
    </div>

    <div class="settings__group">
      <h2>Организация</h2>
      <dl class="settings__summary">
        <div><dt>Название</dt><dd>{{ currentUser.organization.name }}</dd></div>
      </dl>
      <button type="button" data-testid="organization-info" @click="openOrganizationSettings">Подробнее</button>
    </div>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--space-5);
}

.settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.settings__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.settings h1 {
  margin: 0;
}

.settings__group {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.settings__group h2 {
  margin: 0;
  font-size: 1.125rem;
}

.settings__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.settings__summary dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.settings__summary dd {
  margin: var(--space-1) 0 0;
}

.settings button {
  width: fit-content;
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.settings__notice {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

@media (max-width: 47.99rem) {
  .settings__summary { grid-template-columns: 1fr; }
}
</style>
