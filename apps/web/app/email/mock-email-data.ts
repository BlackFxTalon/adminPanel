import type { EmailMessage, EmailBoardData } from './email-data'

const messages: readonly EmailMessage[] = [
  { id: 'email-1', direction: 'incoming', contact: 'info@uralmash.invalid', subject: 'Счёт на оплату №145', receivedAt: '2026-08-23T08:10:00.000Z', folder: 'Входящие' },
  { id: 'email-2', direction: 'incoming', contact: 'anna@uralreduktor.invalid', subject: 'Договор поставки — правки', receivedAt: '2026-08-22T16:45:00.000Z', folder: 'Входящие' },
  { id: 'email-3', direction: 'outgoing', contact: 'office@translogistics.invalid', subject: 'Заявка на перевозку', receivedAt: '2026-08-21T13:20:00.000Z', folder: 'Исходящие' },
]

export function createMockEmailData(): EmailBoardData {
  return {
    async messages(direction) {
      return messages.filter(message => message.direction === direction)
    },
  }
}
