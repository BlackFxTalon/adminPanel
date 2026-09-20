import { expect, test, type Page } from '@playwright/test'

import { readAuthTestEnvironment } from '../../../api/test/auth-test-environment'

const authTestEnvironment = readAuthTestEnvironment()

test.skip(process.env.NUXT_PUBLIC_ORDERS_DATA_MODE !== 'http', 'Runs only against the configured HTTP Orders adapter')

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(authTestEnvironment.AUTH_TEST_ADMIN_EMAIL)
  await page.getByLabel('Пароль').fill(authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('runs the authenticated create, list and detail journey through NestJS and PostgreSQL', async ({ page }) => {
  await signIn(page)
  await page.goto('/orders')
  await expect(page.getByRole('link', { name: 'ORD-2026-002' })).toBeVisible()
  await expect(page.getByText('Foreign Company')).toHaveCount(0)

  await page.getByRole('button', { name: 'Создать заказ' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await dialog.getByLabel('Контрагент').selectOption('contragent-local-reducer')
  await dialog.getByLabel('Предложение').selectOption('offer-local-1')
  await dialog.getByLabel('Название позиции 1').fill('Реальный HTTP Order')
  await dialog.getByLabel('Количество позиции 1').fill('2')
  await dialog.getByLabel('Цена позиции 1, ₽').fill('1500')
  await dialog.getByRole('button', { name: 'Создать заказ' }).click()

  await expect(dialog).toBeHidden()
  const createdLink = page.getByRole('link', { name: /^ORD-\d{4}-[0-9A-F]{8}$/ })
  await expect(createdLink).toBeVisible()
  const number = await createdLink.textContent()
  await createdLink.click()
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: `Заказ ${number}` })).toBeVisible()
  await expect(page.getByText('Реальный HTTP Order')).toBeVisible()
  await expect(page.getByTestId('order-total')).toContainText('3 000,00 ₽')
})

test('smokes the staging public origin: login, Orders list and Order creation through the real adapter', async ({ page }) => {
  test.skip(!process.env.E2E_STAGING_BASE_URL, 'Runs only when E2E_STAGING_BASE_URL points at the staged public origin')

  const stagingSignIn = async (): Promise<void> => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(authTestEnvironment.AUTH_TEST_ADMIN_EMAIL)
    await page.getByLabel('Пароль').fill(authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page).toHaveURL(/\/$/)
  }

  await stagingSignIn()
  await page.goto('/orders')
  await expect(page.getByRole('heading', { name: 'Заказы' })).toBeVisible()
  await expect(page.getByText('Foreign Company')).toHaveCount(0)

  await page.getByRole('button', { name: 'Создать заказ' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await dialog.getByLabel('Контрагент').selectOption({ index: 1 })
  await dialog.getByLabel('Название позиции 1').fill('Staging smoke Order')
  await dialog.getByLabel('Количество позиции 1').fill('1')
  await dialog.getByLabel('Цена позиции 1, ₽').fill('2500')
  await dialog.getByRole('button', { name: 'Создать заказ' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('link', { name: /^ORD-\d{4}-[0-9A-F]{8}$/ }).first()).toBeVisible()
  await expect(page.getByText('Staging smoke Order').first()).toBeVisible()
})
