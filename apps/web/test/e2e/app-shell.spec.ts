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