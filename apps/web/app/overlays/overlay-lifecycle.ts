import { computed, nextTick, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'

export interface OverlayPayloads {
  readonly information: { readonly title: string, readonly message: string }
  readonly form: { readonly title: string, readonly initialValue?: string }
  readonly confirmation: { readonly targetId: string, readonly title: string, readonly message: string }
}

export type OverlayType = keyof OverlayPayloads
export type OverlayCloseReason = 'backdrop' | 'close-button' | 'escape' | 'programmatic'

export interface OverlayEntry<T extends OverlayType = OverlayType> {
  readonly id: string
  readonly type: T
  readonly payload: OverlayPayloads[T]
  readonly invoker: HTMLElement | null
  readonly dismissible: boolean
  dirty: boolean
}

export interface OverlayLifecycle {
  readonly entries: DeepReadonly<Ref<OverlayEntry[]>>
  readonly isActive: ComputedRef<boolean>
  readonly top: ComputedRef<OverlayEntry | null>
  open<T extends OverlayType>(type: T, payload: OverlayPayloads[T]): string
  closeTop(reason?: OverlayCloseReason): void
  markDirty(id: string, dirty: boolean): void
  cancelDiscard(): void
  confirmDiscard(): void
  clear(): void
}

let nextOverlayId = 0

function activeElement(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null
}

export function createOverlayLifecycle(): OverlayLifecycle {
  const stack = ref<OverlayEntry[]>([])
  const active = computed(() => stack.value.at(-1) ?? null)

  function open<T extends OverlayType>(type: T, payload: OverlayPayloads[T]): string {
    const id = `overlay-${++nextOverlayId}`
    stack.value.push({
      id,
      type,
      payload,
      invoker: activeElement(),
      dismissible: type !== 'confirmation',
      dirty: false,
    } as OverlayEntry)
    return id
  }

  function closeTop(reason: OverlayCloseReason = 'programmatic'): void {
    const entry = active.value
    if (!entry || (!entry.dismissible && reason !== 'programmatic')) return
    if (entry.type === 'form' && entry.dirty && reason !== 'programmatic') {
      open('confirmation', {
        targetId: entry.id,
        title: 'Отменить изменения?',
        message: 'Несохранённые данные будут потеряны.',
      })
      return
    }
    stack.value.pop()
    void nextTick(() => entry.invoker?.focus())
  }

  function markDirty(id: string, dirty: boolean): void {
    const entry = stack.value.find(candidate => candidate.id === id)
    if (entry?.type === 'form') entry.dirty = dirty
  }

  function cancelDiscard(): void {
    if (active.value?.type === 'confirmation') stack.value.pop()
  }

  function confirmDiscard(): void {
    const confirmation = active.value
    if (confirmation?.type !== 'confirmation') return
    const targetId = (confirmation.payload as OverlayPayloads['confirmation']).targetId
    stack.value.pop()
    const targetIndex = stack.value.findIndex(entry => entry.id === targetId)
    if (targetIndex < 0) return
    const [target] = stack.value.splice(targetIndex, 1)
    void nextTick(() => target?.invoker?.focus())
  }

  function clear(): void {
    stack.value = []
  }

  return {
    entries: readonly(stack),
    isActive: computed(() => stack.value.length > 0),
    top: active,
    open,
    closeTop,
    markDirty,
    cancelDiscard,
    confirmDiscard,
    clear,
  }
}
