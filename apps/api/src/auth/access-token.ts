export function readBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) return ''
  return authorization.slice('Bearer '.length)
}
