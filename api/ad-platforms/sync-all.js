// Rev:pendiente
// Este script hace un polling cada 24 hrs que permite 2 cosas: 
// 1. Registrar las campañas atribuibles a la agencia creadas en las últimas 24 hrs en la base de datos. Para hacerlo, revisamos el usuario que las creó y si está dentro de la agencia, se asume que la campaña es atribuible
// 2. Registrar en la base de datos las cuentas publicitarias a las que se ha otorgado acceso como partner en las últimas 24 hrs.
import { supabase } from '../../utils/supabase.js'; //instancia en la base de datos

export default async function handler(req, res) {
    // 1. Obtener IDs de usuarios de tu agencia (Business Portfolio)
    const portfolioId = process.env.META_AGENCY_PORTFOLIO_ID;
    const userRes = await fetch(`https://graph.facebook.com/v25.0/${portfolioId}/business_users?fields=id&access_token=${process.env.META_SYSTEM_USER_TOKEN}`);
    const { data: agencyUsers } = await userRes.json();
    const agencyUserIds = agencyUsers.map(u => u.id);

    // 2. Iterar sobre todos los portafolios de clientes en la DB
    const { data: portfolios } = await supabase.from('client_portfolios').select('*');

    for (const port of portfolios) {
        if (port.platform === 'meta') {
            const adAccountsRes = await fetch(`https://graph.facebook.com/v25.0/${port.portfolio_id}/client_ad_accounts?access_token=${process.env.META_SYSTEM_USER_TOKEN}`);
            const { data: accounts } = await adAccountsRes.json();

            for (const acc of accounts) {
                const campRes = await fetch(`https://graph.facebook.com/v25.0/${acc.id}/campaigns?fields=id,created_time,configured_status&access_token=${process.env.META_SYSTEM_USER_TOKEN}`);
                const { data: campaigns } = await campRes.json();
                // Lógica de filtrado por User ID y guardado en managed_campaigns...
            }
        }
    }
    res.send("Sync complete.");
}
