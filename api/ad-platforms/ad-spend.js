import { supabase } from '../../utils/supabase.js';

export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CUSTOM_AUTH_KEY}`) return res.status(401).send("Unauthorized");
    const { location_id, date_preset } = req.query;

    const { data: campaigns } = await supabase.from('managed_campaigns').select('*, client_portfolios!inner(location_id)').eq('client_portfolios.location_id', location_id);

    let totalSpend = 0;
    for (const camp of campaigns) {
        if (camp.platform === 'meta') {
            const resMeta = await fetch(`https://graph.facebook.com{camp.ad_account_id}/insights?fields=spend&date_preset=${date_preset || 'last_28d'}&access_token=${process.env.META_SYSTEM_USER_TOKEN}`);
            const json = await resMeta.json();
            if (json.data?.[0]) totalSpend += parseFloat(json.data[0].spend);
        }
        // Aquí se agregarán cases para google, linkedin, etc.
    }
    res.json({ total_ad_spend: totalSpend });
}
