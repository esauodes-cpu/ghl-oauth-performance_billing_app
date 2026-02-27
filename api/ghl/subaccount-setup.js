//Este código actualiza los custom values de una subcuenta que se indiquen. Es muy útil para actualizar custom values que son importantes a nivel de agencia pero no se pueden definir durante la creación de la subcuenta
// Rev:pendiente

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

    // PUT para actualizar Custom Values (Asumiendo que ya existen en el snapshot) -> Está fallando, solo permite actualizar un valor que ni existe (facturación_atribuible), necesitamos modificar esta parte para que el código modifique los valores que sean y que vengan en el body.
    await fetch(`https://services.leadconnectorhq.com/${location_id}/customValues`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${subToken}`, 'Content-Type': 'application/json', 'Version': '2021-07-28' },
        body: JSON.stringify({ name: 'facturacion_atribuible', value: '0' })
    });
    res.json({ status: "ok" });
    // 1. Obtenemos el catálogo de la subcuenta para encontrar el ID de cada nombre
    const catalogRes = await fetch(`https://services.leadconnectorhq.com/locations/${location_id}/customValues`, {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${subToken}`, 
            'Version': '2021-07-28' 
        }
    });
    const { customValues: allValues } = await catalogRes.json();
    
    // 2. 'custom_values' es el array que envías en el body: [{ "nombre": "Facturación Atribuible", "valor": "500" }]
    if (req.body.custom_values && Array.isArray(req.body.custom_values)) {
        for (const item of req.body.custom_values) {
            // Buscamos el objeto en GHL que tenga el mismo nombre que enviaste
            const match = allValues.find(v => v.name === item.nombre);
    
            if (match) {
                // 3. Si hay match, actualizamos usando su ID único
                await fetch(`https://services.leadconnectorhq.com/${location_id}/customValues/${match.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${subToken}`,
                        'Content-Type': 'application/json',
                        'Version': '2021-07-28'
                    },
                    body: JSON.stringify({ 
                        name: match.name, 
                        value: item.valor 
                    })
                });
            }
        }
}
}
