import { describe, expect, it } from 'vitest'

import { createMockContragentsData } from '../../app/contragents/mock-contragents-data'
import type { ContragentsDataError } from '../../app/contragents/contragents-data'
const currentUser = () => ({
  id: 'user-1',
  email: 'user@example.invalid',
  name: 'Анна Волкова',
  role: 'user' as const,
  organization: { id: 'organization-1', name: 'Моя компания' },
})

describe('Contragents data seam', () => {
  it('returns lookup items shared with Create Order identifiers and labels', async () => {
    const contragents = createMockContragentsData(currentUser)

    const lookup = await contragents.lookup()
    expect(lookup.map(item => [item.id, item.label, item.kind])).toEqual([
      ['contragent-1', 'Уралмашзавод', 'company'],
      ['contragent-2', 'Уралредуктор', 'company'],
      ['contragent-3', 'Анна Соколова', 'contact'],
    ])

    const companies = await contragents.lookup('company')
    expect(companies.map(item => item.label)).toEqual(['Уралмашзавод', 'Уралредуктор'])
    expect(companies.every(item => item.id.startsWith('contragent-'))).toBe(true)
  })

  it('filters, searches and paginates the directory with Company/Contact distinction', async () => {
    const contragents = createMockContragentsData(currentUser)

    const page = await contragents.directory({ page: 1, pageSize: 2 })
    expect(page.total).toBe(3)
    expect(page.items).toHaveLength(2)

    const contacts = await contragents.directory({ page: 1, pageSize: 10, kind: 'contact' })
    expect(contacts.items.map(item => [item.displayName, item.companyName])).toEqual([
      ['Анна Соколова', 'Уралредуктор'],
    ])

    const searched = await contragents.directory({ page: 1, pageSize: 10, search: 'уралредуктор' })
    expect(searched.items.map(item => item.displayName)).toEqual(['Уралредуктор', 'Анна Соколова'])

    await expect(contragents.directory({ page: 0, pageSize: 10 }))
      .rejects.toMatchObject<Partial<ContragentsDataError>>({ code: 'INVALID_CONTRAGENTS_QUERY' })
    await expect(contragents.directory({ page: 1, pageSize: 101 }))
      .rejects.toMatchObject<Partial<ContragentsDataError>>({ code: 'INVALID_CONTRAGENTS_QUERY' })
  })
})
