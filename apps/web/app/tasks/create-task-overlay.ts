import type { AuthenticatedUser, TaskDetail } from '@admin-panel/contracts'

import type { TasksData } from './tasks-data'

export interface CreateTaskOverlayPayload {
  readonly title: string
  readonly data: TasksData
  readonly currentUser: AuthenticatedUser
  readonly onCreated: (task: TaskDetail) => void
}

declare module '../overlays/overlay-lifecycle' {
  interface OverlayPayloads {
    readonly createTask: CreateTaskOverlayPayload
  }
}
