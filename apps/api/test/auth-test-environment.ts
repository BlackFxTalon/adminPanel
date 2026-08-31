function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be supplied by the test environment`)
  return value
}

export function readAuthTestEnvironment() {
  return {
    AUTH_JWT_SECRET: requiredEnvironmentValue('AUTH_JWT_SECRET'),
    AUTH_TEST_ADMIN_EMAIL: requiredEnvironmentValue('AUTH_TEST_ADMIN_EMAIL'),
    AUTH_TEST_ADMIN_PASSWORD: requiredEnvironmentValue('AUTH_TEST_ADMIN_PASSWORD'),
    AUTH_TEST_USER_EMAIL: requiredEnvironmentValue('AUTH_TEST_USER_EMAIL'),
    AUTH_TEST_USER_PASSWORD: requiredEnvironmentValue('AUTH_TEST_USER_PASSWORD'),
  } as const
}
