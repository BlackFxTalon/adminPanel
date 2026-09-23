import type { EventsBoardData } from '../../app/events/events-board-data'
import type { FeedbackBoardData } from '../../app/feedback/feedback-data'
import type { EmailBoardData } from '../../app/email/email-data'
import type { GoodsBoardData } from '../../app/goods/goods-data'
import type { FilesBoardData } from '../../app/files/files-data'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import EventsBoardView from '../../app/events/EventsBoardView.vue'
import { createMockEventsBoardData } from '../../app/events/mock-events-board-data'
import FeedbackView from '../../app/feedback/FeedbackView.vue'
import { createMockFeedbackData } from '../../app/feedback/mock-feedback-data'
import EmailView from '../../app/email/EmailView.vue'
import { createMockEmailData } from '../../app/email/mock-email-data'
import GoodsView from '../../app/goods/GoodsView.vue'
import { createMockGoodsData } from '../../app/goods/mock-goods-data'
import FilesView from '../../app/files/FilesView.vue'
import { createMockFilesData } from '../../app/files/mock-files-data'

describe('Supporting surfaces', () => {
  it('Events Board renders the latest activity feed with kinds and dates', async () => {
    const wrapper = mount(EventsBoardView, { props: { data: createMockEventsBoardData() } })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем события')
    await flushPromises()

    const items = wrapper.get('[data-testid="events-list"]').findAll('li')
    expect(items).toHaveLength(4)
    expect(items[0]!.text()).toContain('Заказ')
    expect(items[0]!.text()).toContain('ORD-2026-006')
    expect(items[1]!.text()).toContain('Звонок')
    expect(items[1]!.text()).toContain('22.08.2026')
  })

  it('Events Board shows the empty state when the feed is empty', async () => {
    const data: EventsBoardData = { latest: vi.fn(async () => []) }
    const wrapper = mount(EventsBoardView, { props: { data } })
    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Событий нет')
  })

  it('Feedback renders site and user topics with sources', async () => {
    const wrapper = mount(FeedbackView, { props: { data: createMockFeedbackData() } })
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Сайт')
    expect(rows[0]!.text()).toContain('Анна Соколова')
    expect(rows[1]!.text()).toContain('Пользователь')
    expect(wrapper.get('h1').text()).toBe('Обратная связь')
  })

  it('Email switches between incoming and outgoing tabs with fresh loads', async () => {
    const wrapper = mount(EmailView, { props: { data: createMockEmailData() } })
    await flushPromises()

    let rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(wrapper.get('h1').text()).toBe('Входящие')

    await wrapper.get('[data-testid="email-tab-outgoing"]').trigger('click')
    await flushPromises()
    rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('Заявка на перевозку')
    expect(wrapper.get('h1').text()).toBe('Исходящие')
    expect(wrapper.get('[data-testid="email-tab-outgoing"]').attributes('aria-pressed')).toBe('true')
  })

  it('Goods renders catalog sections grouped by kind', async () => {
    const wrapper = mount(GoodsView, { props: { data: createMockGoodsData() } })
    await flushPromises()

    expect(wrapper.get('[data-testid="goods-section-goods"]').text()).toContain('Промышленный редуктор РЧ-160')
    expect(wrapper.get('[data-testid="goods-section-prices"]').text()).toContain('Прайс-лист 2026')
    expect(wrapper.get('[data-testid="goods-section-categories"]').text()).toContain('Категории товаров')
    expect(wrapper.get('[data-testid="goods-section-characteristics"]').text()).toContain('крутящий момент')
  })

  it('Files renders the document flow table with all columns', async () => {
    const wrapper = mount(FilesView, { props: { data: createMockFilesData() } })
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Договор поставки №145.pdf')
    expect(rows[0]!.text()).toContain('Уралмашзавод')
    expect(rows[0]!.text()).toContain('PDF')
  })

  it('surfaces a retry-able failure state for each failing seam', async () => {
    const failing: EventsBoardData = { latest: vi.fn(async () => { throw new Error('Сервис событий недоступен.') }) }
    const events = mount(EventsBoardView, { props: { data: failing } })
    await flushPromises()
    expect(events.get('[role="alert"]').text()).toContain('Сервис событий недоступен')

    const failingFeedback: FeedbackBoardData = { topics: vi.fn(async () => { throw new Error('Сервис обращений недоступен.') }) }
    const feedback = mount(FeedbackView, { props: { data: failingFeedback } })
    await flushPromises()
    expect(feedback.get('[role="alert"]').text()).toContain('Сервис обращений недоступен')

    const failingEmail: EmailBoardData = { messages: vi.fn(async () => { throw new Error('Сервис почты недоступен.') }) }
    const email = mount(EmailView, { props: { data: failingEmail } })
    await flushPromises()
    expect(email.get('[role="alert"]').text()).toContain('Сервис почты недоступен')

    const failingGoods: GoodsBoardData = { sections: vi.fn(async () => { throw new Error('Сервис товаров недоступен.') }) }
    const goods = mount(GoodsView, { props: { data: failingGoods } })
    await flushPromises()
    expect(goods.get('[role="alert"]').text()).toContain('Сервис товаров недоступен')

    const failingFiles: FilesBoardData = { documents: vi.fn(async () => { throw new Error('Сервис файлов недоступен.') }) }
    const files = mount(FilesView, { props: { data: failingFiles } })
    await flushPromises()
    expect(files.get('[role="alert"]').text()).toContain('Сервис файлов недоступен')
  })
})
