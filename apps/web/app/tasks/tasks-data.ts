import type {
  CreateTaskInput,
  StructuredError,
  TaskCreationOptions,
  TaskDetail,
  TasksPage,
  TasksQuery,
} from '@admin-panel/contracts'

export interface TasksData {
  list(query: TasksQuery): Promise<TasksPage>
  creationOptions(): Promise<TaskCreationOptions>
  create(input: CreateTaskInput): Promise<TaskDetail>
}

export class TasksDataError extends Error implements StructuredError {
  readonly code: string
  readonly requestId: string
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>

  constructor(error: StructuredError) {
    super(error.message)
    this.name = 'TasksDataError'
    this.code = error.code
    this.requestId = error.requestId
    this.fieldErrors = error.fieldErrors
  }
}
