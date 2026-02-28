// api/ghl/auth/callback.js
import supabase from '../../supabase.js';

export default async function handler(req, res) {
  const { code, error: queryError } = req.query;

  // 1️⃣ Validación de entorno
  if (!process.env.GHL_CLIENT_ID || !process.env.GHL_CLIENT_SECRET) {
    return res.status(500).send('Server misconfiguration: missing OAuth credentials');
  }

  // 2️⃣ Usuario canceló instalación
  if (queryError) {
    return res.status(400).send(`Error de autorización: ${queryError}`);
  }

  if (!code) {
    return res.status(400).send('No se proporcionó el código de autorización.');
  }

  try {
    // 3️⃣ Intercambio authorization_code → tokens
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code
      })
    });

    const data = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
      throw new Error(data.error_description || 'Error al intercambiar el token');
    }

    if (!data.access_token || !data.refresh_token) {
      throw new Error('Invalid token response from GHL');
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // 4️⃣ Guardar tokens en DB
    const { error: dbError } = await supabase
      .from('auth_credentials')
      .upsert({
        platform: 'ghl',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
        // company_id: data.companyId // opcional si agregas columna
      }, { onConflict: 'platform' });

    if (dbError) throw dbError;

    // 5️⃣ Respuesta amigable
    res.status(200).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1>¡Conexión Exitosa!</h1>
          <p>La aplicación de Performance Billing ha sido vinculada correctamente.</p>
          <small>Ya puedes cerrar esta ventana.</small>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[GHL Callback Error]', error);
    res.status(500).send('Error interno al procesar la autorización.');
  }
}
