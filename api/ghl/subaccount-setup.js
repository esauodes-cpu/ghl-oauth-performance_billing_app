import { getValidAgencyToken } from '../../utils/ghl_refresh_token.js';
import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CUSTOM_AUTH_KEY}`) return res.status(401).send("Unauthorized");
    const { location_id, portfolio_id, platform, client_name } = req.body;

    await supabase.from('clients').upsert({ location_id, client_name });
    await supabase.from('client_portfolios').upsert({ location_id, platform, portfolio_id });

    const agencyToken = await getValidAgencyToken();
    const tokenRes = await fetch('https://services.leadconnectorhq.com/oauth/locationToken', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${agencyToken}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Version': '2021-07-28' },
        body: new URLSearchParams({ companyId: process.env.COMPANY_ID, locationId: location_id })
    });
    const { access_token: subToken } = await tokenRes.json();

    // PUT para actualizar Custom Values (Asumiendo que ya existen en el snapshot)
    await fetch(`https://services.leadconnectorhq.com{location_id}/customValues/`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${subToken}`, 'Content-Type': 'application/json', 'Version': '2021-07-28' },
        body: JSON.stringify({ name: 'facturacion_atribuible', value: '0' })
    });
    res.json({ status: "ok" });
}
