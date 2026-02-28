// api/ghl/auth/callback.js
import supabase from '../../supabase.js'; // Ajustado a la ruta de tu singleton

export default async function handler(req, res) {
    const { code, error: queryError } = req.query;

    // 1. Manejo de error si el usuario cancela la instalación
    if (queryError) {
        return res.status(400).send(`Error de autorización: ${queryError}`);
    }

    if (!code) {
        return res.status(400).send("No se proporcionó el código de autorización.");
    }

    try {
        // 2. Intercambio de code por tokens usando Fetch
        const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GHL_CLIENT_ID, // Nombre de variable según tu PDF
                client_secret: process.env.GHL_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code
            })
        });

        const data = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(data.error_description || 'Error al intercambiar el token');
        }

        // 3. Guardado en la tabla auth_credentials (según tu esquema SQL de la pág 4)
        const { error: dbError } = await supabase
            .from('auth_credentials')
            .upsert({
                platform: 'ghl', // Identificador para tu tabla de plataformas
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
                // company_id: data.companyId // Opcional: podrías guardarlo si añades la columna a tu SQL
            }, { onConflict: 'platform' });

        if (dbError) throw dbError;

        // 4. Respuesta amigable al usuario
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
        console.error('Callback Error:', error);
        res.status(500).send("Error interno al procesar la autorización.");
    }
}
