import type { FileEntry, FilesBoardData } from './files-data'

const documents: readonly FileEntry[] = [
  { id: 'file-1', name: 'Договор поставки №145.pdf', updatedAt: '2026-08-22T10:00:00.000Z', contragent: 'Уралмашзавод', organization: 'Моя компания', fileType: 'PDF', owner: 'Анна Волкова' },
  { id: 'file-2', name: 'Спецификация редукторов.xlsx', updatedAt: '2026-08-21T14:30:00.000Z', contragent: 'Уралредуктор', organization: 'Моя компания', fileType: 'XLSX', owner: 'Иван Петров' },
]

export function createMockFilesData(): FilesBoardData {
  return {
    async documents() {
      return documents
    },
  }
}
