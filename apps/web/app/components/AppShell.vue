<script setup lang="ts">
import { primaryNavigationGroups } from '../navigation/route-intent'
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <NuxtLink
        class="app-shell__brand"
        data-testid="product-name"
        to="/"
      >
        AdminPanel
      </NuxtLink>
      <span class="app-shell__environment">Nuxt workspace</span>
    </header>

    <div class="app-shell__workspace">
      <aside class="app-shell__sidebar">
        <nav aria-label="Основная навигация">
          <ul
            v-for="(group, index) in primaryNavigationGroups"
            :key="index"
            class="app-shell__navigation"
          >
            <li
              v-for="destination in group"
              :key="destination.to"
            >
              <NuxtLink
                class="app-shell__navigation-link"
                :to="destination.to"
              >
                {{ destination.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </aside>

      <main class="app-shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  color: var(--color-text);
  background: var(--color-surface-subtle);
}

.app-shell__header {
  position: sticky;
  z-index: var(--z-sticky);
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 4.5rem;
  padding-inline: var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-shell__brand {
  color: var(--color-brand);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.app-shell__environment {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.app-shell__workspace {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  min-height: calc(100vh - 4.5rem);
}

.app-shell__sidebar {
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--color-border);
  background: var(--color-navigation);
}

.app-shell__navigation {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.app-shell__navigation + .app-shell__navigation {
  margin-top: var(--space-6);
}

.app-shell__navigation-link {
  display: block;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
  transition:
    color var(--motion-duration-fast) var(--motion-easing-standard),
    background-color var(--motion-duration-fast) var(--motion-easing-standard);
}

.app-shell__navigation-link:hover,
.app-shell__navigation-link.router-link-active {
  color: var(--color-primary);
  background: var(--color-navigation-hover);
}

.app-shell__content {
  padding: var(--space-7);
}

@media (max-width: 48rem) {
  .app-shell__workspace {
    grid-template-columns: 1fr;
  }

  .app-shell__sidebar {
    overflow-x: auto;
    padding: var(--space-2);
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .app-shell__navigation {
    display: flex;
    width: max-content;
  }

  .app-shell__content {
    padding: var(--space-5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell__navigation-link {
    transition: none;
  }
}
</style>