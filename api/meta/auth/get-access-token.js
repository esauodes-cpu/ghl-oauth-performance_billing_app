// api/meta/auth/get-access-token.js
export async function getAccessToken() {
  if (!process.env.META_SYSTEM_USER_TOKEN) {
    throw new Error('[Meta] Missing system user token');
  }

  return process.env.META_SYSTEM_USER_TOKEN;
}
