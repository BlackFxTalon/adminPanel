export interface PrimaryRoute {
  readonly label: string
  readonly to: string
}

export const primaryNavigationGroups = [
  [
    { label: 'Профиль', to: '/userPage' },
    { label: 'Лента событий', to: '/eventsBoard' },
    { label: 'Задачи', to: '/taskPage' },
    { label: 'Обратная связь', to: '/feedbackPage' },
    { label: 'Почта', to: '/emailPage' },
  ],
  [
    { label: 'Заказы', to: '/orders' },
    { label: 'Финансы', to: '/financesPage' },
    { label: 'Контрагенты', to: '/contragentsPage' },
  ],
  [
    { label: 'Товары', to: '/goodsPage' },
    { label: 'Файлы', to: '/filesPage' },
    { label: 'Пользователи', to: '/usersPage' },
  ],
  [
    { label: 'Настройки', to: '/settingsPage' },
    { label: 'Выйти', to: '/login' },
  ],
] as const satisfies readonly (readonly PrimaryRoute[])[]

export const primaryRoutes: readonly PrimaryRoute[] = primaryNavigationGroups.flat()