export default defineNuxtConfig({
  compatibilityDate: '2026-08-30',
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],
  modules: ['@nuxt/eslint'],
  typescript: {
    strict: true,
    typeCheck: true,
  },
})