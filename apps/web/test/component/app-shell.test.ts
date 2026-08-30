import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppShell from '../../app/components/AppShell.vue'
import { primaryRoutes } from '../../app/navigation/route-intent'

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
      primaryRoutes.map(destination => [destination.label, destination.to]),
    )
  })
})