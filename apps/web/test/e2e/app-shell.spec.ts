import { expect, test } from '@playwright/test'

test('loads the Nuxt application shell at the root route', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('product-name')).toHaveText('AdminPanel')
  await expect(page.getByRole('heading', { name: 'Рабочий стол' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible()
})