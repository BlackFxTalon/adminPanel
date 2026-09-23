import type { EventEntry, EventsBoardData } from './events-board-data'

const entries: readonly EventEntry[] = [
  { id: 'event-1', kind: 'order', occurredAt: '2026-08-23T09:00:00.000Z', title: 'ORD-2026-006', detail: 'Статус изменён на «Ожидает оплаты»' },
  { id: 'event-2', kind: 'call', occurredAt: '2026-08-22T15:30:00.000Z', title: '+7 343 111-22-33', detail: 'Звонок: Уралмашзавод, обсуждение поставки' },
  { id: 'event-3', kind: 'contragent', occurredAt: '2026-08-21T11:00:00.000Z', title: 'ТрансЛогистика', detail: 'Новый контрагент добавлен в справочник' },
  { id: 'event-4', kind: 'order', occurredAt: '2026-08-20T10:15:00.000Z', title: 'ORD-2026-005', detail: 'Заказ отменён' },
]

export function createMockEventsBoardData(): EventsBoardData {
  return {
    async latest() {
      return entries
    },
  }
}
