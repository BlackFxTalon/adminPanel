import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import OverlayHost from '../../app/overlays/OverlayHost.vue'
import { createOverlayLifecycle } from '../../app/overlays/overlay-lifecycle'

describe('Overlay host', () => {
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.innerHTML = ''
  })

  it('renders an accessible top dialog, locks scroll and restores invoking focus', async () => {
    const lifecycle = createOverlayLifecycle()
    const invoker = document.createElement('button')
    invoker.textContent = 'Открыть'
    document.body.append(invoker)
    invoker.focus()

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      props: { lifecycle },
    })
    lifecycle.open('information', { message: 'Описание', title: 'Информация' })
    await nextTick()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBeTruthy()
    expect(document.activeElement?.textContent).toBe('Информация')
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.get('[data-overlay-backdrop]').trigger('click')
    await nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(invoker)
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('preserves a hidden form through nested, Escape and dirty confirmation flows', async () => {
    const lifecycle = createOverlayLifecycle()
    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      props: { lifecycle },
    })
    const activeLayer = () => wrapper.findAll('[data-overlay-id]').find(layer => layer.isVisible())!
    lifecycle.open('form', { initialValue: 'Исходное', title: 'Новый заказ' })
    await nextTick()

    const input = wrapper.get('input')
    expect(document.activeElement).toBe(input.element)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Закрыть')
    input.element.focus()
    await input.setValue('Черновик')

    lifecycle.open('information', { message: 'Подсказка', title: 'Информация' })
    await nextTick()
    expect(wrapper.findAll('[data-overlay-id]')).toHaveLength(2)
    expect(wrapper.findAll('[data-overlay-id]')[0]?.isVisible()).toBe(false)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.get('input').element.value).toBe('Черновик')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(activeLayer().get('[role="dialog"] h2').text()).toBe('Отменить изменения?')
    expect(document.activeElement?.textContent).toBe('Продолжить редактирование')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(activeLayer().get('[role="dialog"] h2').text()).toBe('Отменить изменения?')

    await activeLayer().get('button[data-overlay-initial-focus]').trigger('click')
    await nextTick()
    expect(wrapper.get('input').element.value).toBe('Черновик')

    await activeLayer().get('[data-overlay-backdrop]').trigger('click')
    await nextTick()
    await activeLayer().get('button[data-overlay-initial-focus]').trigger('click')
    await nextTick()
    await activeLayer().get('button[aria-label="Закрыть"]').trigger('click')
    await nextTick()
    await activeLayer().get('[role="dialog"] button:last-child').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    lifecycle.open('form', { title: 'Новый чистый заказ' })
    await nextTick()
    expect(wrapper.get('input').element.value).toBe('')
    wrapper.unmount()
  })
})
