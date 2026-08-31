import { describe, expect, it } from 'vitest'

import { createOverlayLifecycle } from '../../app/overlays/overlay-lifecycle'

describe('Overlay lifecycle', () => {
  it('keeps a hidden parent entry while a nested Overlay is active', () => {
    const lifecycle = createOverlayLifecycle()

    const parent = lifecycle.open('form', { title: 'Новый заказ' })
    const nested = lifecycle.open('information', { message: 'Подсказка', title: 'Информация' })

    expect(lifecycle.entries.value.map(entry => entry.id)).toEqual([parent, nested])
    expect(lifecycle.top.value?.id).toBe(nested)

    lifecycle.closeTop()

    expect(lifecycle.entries.value.map(entry => entry.id)).toEqual([parent])
    expect(lifecycle.top.value?.id).toBe(parent)
  })

  it('turns an attempted dirty-form close into a confirmation flow', () => {
    const lifecycle = createOverlayLifecycle()
    const form = lifecycle.open('form', { initialValue: 'Сохранённый ввод', title: 'Новый заказ' })
    lifecycle.markDirty(form, true)

    lifecycle.closeTop('escape')

    expect(lifecycle.entries.value.map(entry => entry.type)).toEqual(['form', 'confirmation'])
    expect(lifecycle.entries.value[0]?.payload).toMatchObject({ initialValue: 'Сохранённый ввод' })

    lifecycle.cancelDiscard()
    expect(lifecycle.top.value?.id).toBe(form)

    lifecycle.closeTop('backdrop')
    lifecycle.confirmDiscard()
    expect(lifecycle.entries.value).toHaveLength(0)
  })

  it('closes only a dismissible top entry and clears the stack on route reset', () => {
    const lifecycle = createOverlayLifecycle()
    lifecycle.open('information', { message: 'Первый слой', title: 'Информация' })
    lifecycle.open('confirmation', {
      message: 'Подтвердите действие',
      targetId: 'external-action',
      title: 'Подтверждение',
    })

    lifecycle.closeTop('escape')
    expect(lifecycle.entries.value).toHaveLength(2)

    lifecycle.clear()
    expect(lifecycle.entries.value).toHaveLength(0)
  })
})
