// api/auth-manager.js
import ghlAuth from './ghl/auth/get-access-token.js';
import metaAuth from './meta/auth/get-access-token.js';

export const getAccessToken = async (platform, locationId = null) => {
  switch (platform) {
    case 'ghl':
      return ghlAuth.getToken(locationId);
    case 'meta':
      return metaAuth.getToken();
    // Añadir casos para google, linkedin, tiktok...
    default:
      throw new Error(`Platform ${platform} not supported for auth`);
  }
};
