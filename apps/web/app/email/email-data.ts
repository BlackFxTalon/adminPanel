export interface EmailMessage {
  readonly id: string
  readonly direction: 'incoming' | 'outgoing'
  readonly contact: string
  readonly subject: string
  readonly receivedAt: string
  readonly folder: string
}

export interface EmailBoardData {
  messages(direction: 'incoming' | 'outgoing'): Promise<readonly EmailMessage[]>
}
