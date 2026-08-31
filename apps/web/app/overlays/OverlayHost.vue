<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch, type WatchStopHandle } from 'vue'

import type { OverlayLifecycle, OverlayType } from './overlay-lifecycle'
import { overlayRegistry } from './overlay-registry'

const props = defineProps<{ lifecycle: OverlayLifecycle }>()
const entries = props.lifecycle.entries
let previousBodyOverflow = ''
let stopScrollWatch: WatchStopHandle | undefined
interface OverlayIdentity { readonly id: string, readonly type: OverlayType }

function isTop(entry: OverlayIdentity): boolean {
  return props.lifecycle.top.value?.id === entry.id
}

function headingId(entry: OverlayIdentity): string {
  return `${entry.id}-heading`
}

function close(entry: OverlayIdentity, reason: 'backdrop' | 'close-button' | 'escape'): void {
  if (isTop(entry)) props.lifecycle.closeTop(reason)
}

function handleKeydown(event: KeyboardEvent): void {
  const top = props.lifecycle.top.value
  if (!top) return
  if (event.key === 'Tab') {
    const root = document.querySelector<HTMLElement>(`[data-overlay-id="${top.id}"]`)
    const focusable = [...(root?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    if (focusable.length === 0) return
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1)
    event.preventDefault()
    focusable[nextIndex]?.focus()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    close(top, 'escape')
  }
}

function focusTop(): void {
  const top = props.lifecycle.top.value
  if (!top) return
  const root = document.querySelector<HTMLElement>(`[data-overlay-id="${top.id}"]`)
  const focusOrder = [
    '[aria-invalid="true"]',
    '[data-overlay-initial-focus]',
    '[data-overlay-heading]',
    'button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
  ]
  const target = focusOrder
    .map(selector => root?.querySelector<HTMLElement>(selector))
    .find(candidate => candidate !== null && candidate !== undefined)
  target?.focus()
}

watch(
  () => props.lifecycle.top.value?.id,
  focusTop,
  { flush: 'post' },
)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  stopScrollWatch = watch(
    () => props.lifecycle.isActive.value,
    active => {
      if (active) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    },
    { immediate: true },
  )
})
onBeforeUnmount(() => {
  stopScrollWatch?.()
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="overlay-host" aria-live="polite">
    <section
      v-for="entry in entries"
      v-show="isTop(entry)"
      :key="entry.id"
      class="overlay-host__layer"
      :data-overlay-id="entry.id"
      :aria-hidden="isTop(entry) ? undefined : 'true'"
      :inert="!isTop(entry)"
    >
      <div
        class="overlay-host__backdrop"
        data-overlay-backdrop
        @click.self="close(entry, 'backdrop')"
      >
        <div
          class="overlay-host__panel"
          :class="`overlay-host__panel--${entry.type}`"
          role="dialog"
          :aria-labelledby="headingId(entry)"
          :aria-modal="isTop(entry) ? 'true' : undefined"
        >
          <component
            :is="overlayRegistry[entry.type].component"
            :heading-id="headingId(entry)"
            :payload="entry.payload"
            @close="close(entry, 'close-button')"
            @dirty-change="lifecycle.markDirty(entry.id, $event)"
            @cancel="lifecycle.cancelDiscard()"
            @confirm="lifecycle.confirmDiscard()"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay-host__layer {
  position: fixed;
  z-index: var(--z-overlay);
  inset: 0;
}

.overlay-host__backdrop {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  background: rgb(22 28 45 / 45%);
}

.overlay-host__panel {
  width: min(100%, 34rem);
  max-height: 100%;
  overflow-y: auto;
  padding: var(--space-6);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  animation: overlay-from-bottom var(--motion-duration-normal) var(--motion-easing-standard);
}

:deep(.overlay-content__header),
:deep(.overlay-content__actions) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

:deep(.overlay-content h2) {
  margin-block: 0 var(--space-4);
}

:deep(.overlay-content label) {
  display: grid;
  gap: var(--space-2);
}

:deep(.overlay-content input) {
  padding: var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}

@keyframes overlay-from-bottom {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@media (min-width: 75rem) {
  .overlay-host__panel {
    height: 100%;
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    animation-name: overlay-from-side;
  }

  @keyframes overlay-from-side {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .overlay-host__panel { animation: none; }
}
</style>
