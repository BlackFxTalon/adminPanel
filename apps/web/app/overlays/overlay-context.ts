import { inject, provide, type InjectionKey } from 'vue'

import type { OverlayLifecycle } from './overlay-lifecycle'

const overlayLifecycleKey: InjectionKey<OverlayLifecycle> = Symbol('Overlay lifecycle')

export function provideOverlayLifecycle(lifecycle: OverlayLifecycle): void {
  provide(overlayLifecycleKey, lifecycle)
}

export function useOverlayLifecycle(): OverlayLifecycle {
  const lifecycle = inject(overlayLifecycleKey)
  if (!lifecycle) throw new Error('Overlay lifecycle is only available inside the application shell')
  return lifecycle
}
