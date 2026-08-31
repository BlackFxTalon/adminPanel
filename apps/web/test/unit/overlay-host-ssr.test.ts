import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import OverlayHost from '../../app/overlays/OverlayHost.vue'
import { createOverlayLifecycle } from '../../app/overlays/overlay-lifecycle'

describe('Overlay host SSR', () => {
  it('renders an empty host without touching browser globals', async () => {
    const lifecycle = createOverlayLifecycle()
    const app = createSSRApp({
      render: () => h(OverlayHost, { lifecycle }),
    })

    await expect(renderToString(app)).resolves.toContain('overlay-host')
  })
})
