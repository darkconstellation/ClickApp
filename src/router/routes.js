const routes = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/private' },
      { path: 'private', component: () => import('pages/PrivateChat.vue') },
      { path: 'work', component: () => import('pages/WorkChat.vue') },
      { path: 'media', component: () => import('pages/MediaViewer.vue') },
      { path: 'testing', component: () => import('pages/TestingChat.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
