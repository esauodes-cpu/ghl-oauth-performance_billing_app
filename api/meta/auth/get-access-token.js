// api/meta/auth/get-access-token.js

export const getToken = async () => {
  const META_SYSTEM_USER_TOKEN = process.env.META_SYSTEM_USER_TOKEN;
  if (!META_SYSTEM_USER_TOKEN) {
    throw new Error('Missing META_SYSTEM_USER_TOKEN environment variable');
  }
  return META_SYSTEM_USER_TOKEN;
};
