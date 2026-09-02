import { readonly, shallowRef } from 'vue'

export function useLatestAsyncResource<T>(initiallyLoading = false) {
  const data = shallowRef<T | null>(null)
  const loading = shallowRef(initiallyLoading)
  const error = shallowRef<string | null>(null)
  let latestRequest = 0

  async function load(loader: () => Promise<T>, fallbackMessage: string): Promise<T | undefined> {
    const request = ++latestRequest
    loading.value = true
    error.value = null
    data.value = null

    try {
      const next = await loader()
      if (request !== latestRequest) return undefined
      data.value = next
      return next
    } catch (caught) {
      if (request !== latestRequest) return undefined
      error.value = caught instanceof Error ? caught.message : fallbackMessage
      return undefined
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  function replace(next: T): void {
    latestRequest += 1
    data.value = next
    loading.value = false
    error.value = null
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    load,
    replace,
  }
}
