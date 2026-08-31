import { defineEventHandler, getRequestURL, getRouterParam, proxyRequest } from 'h3'

export default defineEventHandler(event => {
  const config = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path') ?? ''
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const target = new URL(`${config.apiInternalBase.replace(/\/$/, '')}/${encodedPath}`)
  target.search = getRequestURL(event).search

  return proxyRequest(event, target.toString())
})
