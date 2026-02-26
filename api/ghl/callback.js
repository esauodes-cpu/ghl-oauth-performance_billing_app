//Este código es el redirect url endpoint cuando la aplicación se instala en una agencia. Lo que hace es captar el código de autorización que se genera al instalar la app, lo cambia por el primer par de access+refresh tokens y los guarda en la base de datos
//Revisado : OK

import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
    const { code } = req.query;
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code
        })
    });
    const data = await response.json();
    await supabase.from('agency_auth').upsert({
        company_id: data.companyId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
    });
    res.send("Autorizado.");
}
