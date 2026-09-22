import { expect, test, type Page } from '@playwright/test'

import { readAuthTestEnvironment } from '../../../api/test/auth-test-environment'

const authTestEnvironment = readAuthTestEnvironment()

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  const loginButton = page.getByRole('button', { name: 'Войти' })
  await expect(loginButton).toBeEnabled()
  await page.getByLabel('Email').fill(authTestEnvironment.AUTH_TEST_ADMIN_EMAIL)
  await page.getByLabel('Пароль').fill(authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD)
  await loginButton.click()
  await expect(page).toHaveURL(/\/$/)
}

test('redirects an unauthenticated User from the protected root route to login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('redirects unauthenticated Users from the Users, Profile and Settings routes to login', async ({ page }) => {
  for (const route of ['/usersPage', '/userPage', '/settingsPage']) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible()
  }
})

test('signs in, restores after a page refresh and revokes the session on logout', async ({ page }) => {
  await signIn(page)
  await expect(page.getByTestId('product-name')).toHaveText('AdminPanel')

  await page.reload()
  await expect(page.getByTestId('product-name')).toHaveText('AdminPanel')

  const logoutButton = page.getByRole('button', { name: 'Выйти' })
  await expect(logoutButton).toBeEnabled()
  await logoutButton.click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

test('redirects an active SPA session after server-side revocation', async ({ page, request }) => {
  await signIn(page)
  const refreshCookie = (await page.context().cookies())
    .find(cookie => cookie.name === 'admin_panel_refresh')
  expect(refreshCookie).toBeDefined()

  await request.post('http://127.0.0.1:3001/api/v1/auth/logout', {
    headers: { Cookie: `${refreshCookie!.name}=${refreshCookie!.value}` },
  })

  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login$/)
})

const mockAdapterOnly = process.env.NUXT_PUBLIC_ORDERS_DATA_MODE === 'http'

test('browses deterministic Orders and opens returned detail', async ({ page }) => {
  test.skip(mockAdapterOnly, 'Runs only against the mock Orders adapter')
  await signIn(page)
  await page.goto('/orders')

  await expect(page.getByRole('heading', { name: 'Заказы' })).toBeVisible()
  const orderLink = page.getByRole('link', { name: 'ORD-2026-006' })
  await expect(orderLink).toBeVisible()
  await expect(page.getByRole('row', { name: /ORD-2026-006/ }).getByText('Ожидает оплаты', { exact: true })).toBeVisible()
  await orderLink.click()

  await expect(page).toHaveURL(/\/orders\/order-6$/)
  await expect(page.getByRole('heading', { name: 'Заказ ORD-2026-006' })).toBeVisible()
  await expect(page.getByText('Насосный агрегат')).toBeVisible()
  await expect(page.getByTestId('order-total')).toContainText('780 000,00 ₽')
})

test('browses deterministic Offers with associated Order totals', async ({ page }) => {
  test.skip(mockAdapterOnly, 'Runs only against the mock Orders adapter')
  await signIn(page)
  await page.goto('/financesPage')

  await expect(page.getByRole('heading', { name: 'Предложения' })).toBeVisible()
  const offerRow = page.getByRole('row', { name: /OFF-2026-001/ })
  await expect(offerRow).toBeVisible()
  await expect(offerRow.getByText('Уралредуктор')).toBeVisible()
  await expect(offerRow.getByTestId('offer-orders-count')).toHaveText('1')
  await expect(offerRow.getByTestId('offer-orders-total')).toContainText('300 000,00 ₽')

  const unattachedRow = page.getByRole('row', { name: /OFF-2026-002/ })
  await expect(unattachedRow.getByTestId('offer-orders-count')).toHaveText('0')
  await expect(unattachedRow.getByText('—')).toBeVisible()
})

test('creates an Order through the shared Overlay and shows the authoritative response in the list', async ({ page }) => {
  test.skip(mockAdapterOnly, 'Runs only against the mock Orders adapter')
  await signIn(page)
  await page.goto('/orders')

  await page.getByRole('button', { name: 'Создать заказ' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Local Organization')).toBeVisible()
  await expect(dialog.getByText('Local Admin')).toBeVisible()

  await dialog.getByLabel('Контрагент').selectOption('contragent-2')
  await dialog.getByLabel('Предложение').selectOption('offer-1')
  await dialog.getByLabel('Название позиции 1').fill('Редуктор для E2E')
  await dialog.getByLabel('Количество позиции 1').fill('2')
  await dialog.getByLabel('Цена позиции 1, ₽').fill('145000')
  await dialog.getByLabel('Характеристики позиции 1').fill('Передаточное отношение 20:1')
  await dialog.getByLabel('Вес позиции 1, г').fill('1200')
  await dialog.getByLabel('Объём позиции 1, см³').fill('2400')
  await dialog.getByRole('button', { name: 'Добавить позицию' }).click()
  await expect(dialog.getByText('Позиция 2', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Удалить позицию 2' }).click()
  await expect(dialog.getByTestId('order-create-total')).toContainText('290 000,00 ₽')

  await dialog.getByRole('button', { name: 'Создать заказ' }).focus()
  await page.keyboard.press('Enter')

  await expect(dialog).toBeHidden()
  const createdLink = page.getByRole('link', { name: 'ORD-2026-007' })
  await expect(createdLink).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Local Admin' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Local Organization' })).toBeVisible()
  await createdLink.click()
  await expect(page).toHaveURL(/\/orders\/order-7$/)
  await expect(page.getByRole('heading', { name: 'Заказ ORD-2026-007' })).toBeVisible()
  await expect(page.getByText('Редуктор для E2E')).toBeVisible()
  await expect(page.getByTestId('order-total')).toContainText('290 000,00 ₽')
})

test('rejects an invalid Order and keeps the entered values editable in the Overlay', async ({ page }) => {
  await signIn(page)
  await page.goto('/orders')

  await page.getByRole('button', { name: 'Создать заказ' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await expect(dialog).toBeVisible()

  await dialog.getByRole('button', { name: 'Создать заказ' }).click()
  await expect(dialog.getByText('Выберите контрагента.')).toBeVisible()
  await expect(dialog.getByText('Введите название позиции.')).toBeVisible()

  await dialog.getByLabel('Контрагент').selectOption({ index: 1 })
  await dialog.getByLabel('Название позиции 1').fill('Заказ с ошибкой количества')
  await dialog.getByLabel('Количество позиции 1').fill('0')
  await dialog.getByRole('button', { name: 'Создать заказ' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Количество должно быть положительным целым числом.')).toBeVisible()
  await expect(dialog.getByLabel('Название позиции 1')).toHaveValue('Заказ с ошибкой количества')
  await expect(page.getByRole('link', { name: 'ORD-2026-007' })).toHaveCount(0)
})

test('asks for confirmation when closing a dirty Overlay and keeps the draft on cancel', async ({ page }) => {
  await signIn(page)
  await page.goto('/orders')

  await page.getByRole('button', { name: 'Создать заказ' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Название позиции 1').fill('Черновик для dirty-close')

  await page.keyboard.press('Escape')
  const confirmation = page.getByRole('dialog', { name: 'Отменить изменения?' })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Продолжить редактирование' }).click()
  await expect(confirmation).toBeHidden()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Название позиции 1')).toHaveValue('Черновик для dirty-close')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Отменить изменения?' })).toBeVisible()
  await page.getByRole('dialog', { name: 'Отменить изменения?' }).getByRole('button', { name: 'Отменить изменения' }).click()
  await expect(page.getByRole('dialog', { name: 'Новый заказ' })).toBeHidden()
})

test('creates an Order from the mobile item editor', async ({ page }) => {
  test.skip(mockAdapterOnly, 'Runs only against the mock Orders adapter')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page.goto('/orders')

  await page.getByRole('button', { name: 'Создать заказ' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый заказ' })
  await dialog.getByRole('button', { name: 'Добавить позицию' }).click()
  await expect(dialog.getByText('Позиция 2', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Удалить позицию 2' }).click()
  await dialog.getByLabel('Контрагент').selectOption('contragent-1')
  await dialog.getByLabel('Название позиции 1').fill('Мобильный заказ')
  await dialog.getByLabel('Количество позиции 1').fill('1')
  await dialog.getByLabel('Цена позиции 1, ₽').fill('999')
  await dialog.getByRole('button', { name: 'Создать заказ' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('link', { name: 'ORD-2026-007' })).toBeVisible()
})