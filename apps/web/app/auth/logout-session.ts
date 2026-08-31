export async function revokeSessionAndClearClient(
  requestRevocation: () => Promise<unknown>,
  clearClientSession: () => void,
): Promise<boolean> {
  try {
    await requestRevocation()
    clearClientSession()
    return true
  } catch {
    return false
  }
}
