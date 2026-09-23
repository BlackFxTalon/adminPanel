export interface EventEntry {
  readonly id: string
  readonly kind: 'call' | 'contragent' | 'order'
  readonly occurredAt: string
  readonly title: string
  readonly detail: string
}

export interface EventsBoardData {
  latest(): Promise<readonly EventEntry[]>
}
