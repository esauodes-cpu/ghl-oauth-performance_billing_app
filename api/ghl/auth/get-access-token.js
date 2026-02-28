// api/ghl/auth/get-access-token.js
import supabase from '../../_supabase.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const TEN_MINUTES = 10 * 60 * 1000;

export async function getAccessToken({ location_id }) {
  if (!location_id) {
    throw new Error('[GHL] location_id is required');
  }
  
  if (!process.env.GHL_COMPANY_ID) {
  throw new Error('[GHL] Missing GHL_COMPANY_ID environment variable');
  }

  // Validaciones adicionales
  if (!process.env.GHL_CLIENT_ID || !process.env.GHL_CLIENT_SECRET) {
    throw new Error('[GHL] Missing OAuth credentials');
  }

  // 1️⃣ Obtener credenciales actuales
  const { data: creds, error } = await supabase
    .from('auth_credentials')
    .select('*')
    .eq('platform', 'ghl')
    .single();

  if (error || !creds) {
    throw new Error('[GHL] Agency credentials not found');
  }

  let { access_token, refresh_token, expires_at } = creds;

  const now = new Date();
  const expiresAt = expires_at ? new Date(expires_at) : null;
  const timeLeft = expiresAt ? expiresAt - now : 0;

  // 2️⃣ Validar expiración
  if (!expiresAt || timeLeft < TEN_MINUTES) {
    // 🔄 Intentar refrescar token
    const refreshResponse = await fetch(`${GHL_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        refresh_token
      })
    });

    if (!refreshResponse.ok) {
      throw new Error('[GHL] Failed to refresh agency token');
    }

    const refreshed = await refreshResponse.json().catch(() => {
      throw new Error('[GHL] Invalid refresh response');
    });

    const newAccessToken = refreshed.access_token;
    const newRefreshToken = refreshed.refresh_token;
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    // 🛡️ Protección contra race conditions
    const { data: latestCreds } = await supabase
      .from('auth_credentials')
      .select('access_token, expires_at')
      .eq('platform', 'ghl')
      .single();

    const latestExpiresAt = latestCreds?.expires_at
      ? new Date(latestCreds.expires_at)
      : null;

    // Si otra instancia ya actualizó el token, usamos ese
    if (latestExpiresAt && latestExpiresAt > now) {
      access_token = latestCreds.access_token;
    } else {
      // Guardar nuevo token
      const { error: updateError } = await supabase
        .from('auth_credentials')
        .update({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('platform', 'ghl');

      if (updateError) {
        throw new Error('[GHL] Failed to store refreshed token');
      }

      access_token = newAccessToken;
      refresh_token = newRefreshToken;
      expires_at = newExpiresAt;
    }
  }

  // 3️⃣ Intercambiar por token de subcuenta
  const subTokenResponse = await fetch(`${GHL_BASE_URL}/oauth/locationToken`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      companyId: process.env.GHL_COMPANY_ID,
      locationId: location_id
    })
  });

  if (!subTokenResponse.ok) {
    const errText = await subTokenResponse.text();
    throw new Error(`[GHL] Failed to get subaccount token: ${errText}`);
  }

  const subTokenData = await subTokenResponse.json();

  if (!subTokenData.access_token) {
    throw new Error('[GHL] Invalid subaccount token response');
  }

  // 🎯 Token operativo final
  return subTokenData.access_token;
}
