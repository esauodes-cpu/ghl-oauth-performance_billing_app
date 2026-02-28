import supabase from '../../supabase.js';

export const getToken = async (locationId) => {
  // 1. Obtener credenciales de agencia de Supabase
  const { data: creds, error } = await supabase
    .from('auth_credentials')
    .select('*')
    .eq('platform', 'ghl')
    .single();

  if (error || !creds) throw new Error("No hay credenciales de GHL configuradas.");

  let accessToken = creds.access_token;
  const expiresAt = new Date(creds.expires_at).getTime();
  const now = Date.now();

  // 2. Refrescar si falta menos de 10 min
  if (expiresAt - now < 10 * 60 * 1000) {
    const response = await fetch('https://services.leadconnectorhq.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: creds.refresh_token,
      }),
    });

    const newData = await response.json();
    
    await supabase.from('auth_credentials').update({
      access_token: newData.access_token,
      refresh_token: newData.refresh_token,
      expires_at: new Date(Date.now() + newData.expires_in * 1000).toISOString()
    }).eq('platform', 'ghl');
    
    accessToken = newData.access_token;
  }

  // 3. Intercambio por Token de Subcuenta (Location)
  const locResponse = await fetch(`https://services.leadconnectorhq.com{locationId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Version': '2021-07-28' }
  });
  const locData = await locResponse.json();
  
  return locData.access_token;
};
