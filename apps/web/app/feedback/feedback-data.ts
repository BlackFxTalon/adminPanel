export interface FeedbackTopic {
  readonly id: string
  readonly source: 'site' | 'user'
  readonly author: string
  readonly receivedAt: string
  readonly message: string
}

export interface FeedbackBoardData {
  topics(): Promise<readonly FeedbackTopic[]>
}
