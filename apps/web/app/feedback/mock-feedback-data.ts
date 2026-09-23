import type { FeedbackTopic, FeedbackBoardData } from './feedback-data'

const topics: readonly FeedbackTopic[] = [
  { id: 'feedback-1', source: 'site', author: 'Анна Соколова', receivedAt: '2026-08-23T12:00:00.000Z', message: 'Вопрос по статусу заказа ORD-2026-003.' },
  { id: 'feedback-2', source: 'user', author: 'Иван Петров', receivedAt: '2026-08-22T09:40:00.000Z', message: 'Просьба обновить прайс-лист по редукторам.' },
]

export function createMockFeedbackData(): FeedbackBoardData {
  return {
    async topics() {
      return topics
    },
  }
}
