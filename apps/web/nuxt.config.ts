export default defineNuxtConfig({
  compatibilityDate: '2026-08-30',
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],
  modules: ['@nuxt/eslint'],
  runtimeConfig: {
    apiInternalBase: 'http://127.0.0.1:3001/api/v1',
    public: {
      apiBase: '/api/v1',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})