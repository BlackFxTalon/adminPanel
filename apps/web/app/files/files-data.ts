export interface FileEntry {
  readonly id: string
  readonly name: string
  readonly updatedAt: string
  readonly contragent: string
  readonly organization: string
  readonly fileType: string
  readonly owner: string
}

export interface FilesBoardData {
  documents(): Promise<readonly FileEntry[]>
}
