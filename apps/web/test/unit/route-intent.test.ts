import { describe, expect, it } from 'vitest'

import { primaryRoutes } from '../../app/navigation/route-intent'

describe('primary route intent', () => {
  it('exposes the recognizable migration destinations', () => {
    expect(primaryRoutes).toEqual([
      { label: 'Профиль', to: '/userPage' },
      { label: 'Лента событий', to: '/eventsBoard' },
      { label: 'Задачи', to: '/taskPage' },
      { label: 'Обратная связь', to: '/feedbackPage' },
      { label: 'Почта', to: '/emailPage' },
      { label: 'Заказы', to: '/orders' },
      { label: 'Финансы', to: '/financesPage' },
      { label: 'Контрагенты', to: '/contragentsPage' },
      { label: 'Товары', to: '/goodsPage' },
      { label: 'Файлы', to: '/filesPage' },
      { label: 'Пользователи', to: '/usersPage' },
      { label: 'Настройки', to: '/settingsPage' },
      { label: 'Выйти', to: '/login' },
    ])
  })
})