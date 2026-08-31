import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import AppShell from '../../app/components/AppShell.vue'
import { primaryRoutes } from '../../app/navigation/route-intent'
import { useOverlayLifecycle } from '../../app/overlays/overlay-context'

describe('application shell', () => {
  it('shows the product identity and primary route navigation', () => {
    const wrapper = mount(AppShell, {
      slots: { default: '<h1>Рабочий стол</h1>' },
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="product-name"]').text()).toBe('AdminPanel')
    expect(wrapper.get('main').text()).toContain('Рабочий стол')
    expect(wrapper.findAll('nav a').map(link => [link.text(), link.attributes('href')])).toEqual(
      primaryRoutes
        .filter(destination => destination.to !== '/login')
        .map(destination => [destination.label, destination.to]),
    )
    expect(wrapper.get('button').text()).toBe('Выйти')
  })

  it('exposes logout as an application-shell action', async () => {
    const wrapper = mount(AppShell, {
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    await nextTick()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('logout')).toHaveLength(1)
  })

  it('reports a failed server-side logout without claiming success', () => {
    const wrapper = mount(AppShell, {
      props: { sessionError: 'Не удалось завершить сессию. Повторите попытку.' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось завершить сессию')
  })

  it('owns one host, makes the background inert and clears Overlays on navigation', async () => {
    const OverlayInvoker = defineComponent({
      setup() {
        const overlays = useOverlayLifecycle()
        return { open: () => overlays.open('information', { message: 'Описание', title: 'Информация' }) }
      },
      template: '<button type="button" @click="open">Открыть Overlay</button>',
    })
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      props: { routeKey: '/' },
      slots: { default: OverlayInvoker },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    await wrapper.get('main button').trigger('click')
    await nextTick()
    expect(wrapper.findAll('.overlay-host')).toHaveLength(1)
    expect(wrapper.get('.app-shell__background').attributes()).toHaveProperty('inert')
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')

    await wrapper.setProps({ routeKey: '/orders' })
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('.app-shell__background').attributes()).not.toHaveProperty('inert')
    wrapper.unmount()
  })
})