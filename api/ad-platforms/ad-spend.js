import { supabase } from '../utils/supabase.js';
import { getAccessToken } from '../auth/auth-manager.js';

export default async function handler(req, res) {
    // Validamos el Bearer Token que viene de GHL
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { location_id } = req.body; // GHL manda esto en el webhook
    if (!location_id) return res.status(400).json({ message: "location_id missing" });

    try {
        const systemToken = await getAccessToken('meta');
        
        // 1. Obtener todas las campañas que tenemos registradas para este cliente
        const { data: campaigns } = await supabase
            .from('ad_campaigns')
            .select(`
                campaign_id,
                ad_accounts!inner(
                    ad_assets!inner(location_id)
                )
            `)
            .eq('ad_accounts.ad_assets.location_id', location_id)
            .eq('platform', 'meta');

        if (!campaigns || campaigns.length === 0) {
            return res.json({ total_spend: 0, currency: "USD", message: "No managed campaigns found" });
        }

        // 2. Configurar rango de fechas (Últimos 28 días)
        const until = new Date().toISOString().split('T')[0];
        const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let totalSpend = 0;

        // 3. Consultar Insights de cada campaña en Meta
        for (const camp of campaigns) {
            const insightsRes = await fetch(
                `https://graph.facebook.com{camp.campaign_id}/insights?time_range={'since':'${since}','until':'${until}'}&fields=spend&access_token=${systemToken}`
            );
            const { data: insights } = await insightsRes.json();
            
            if (insights && insights.length > 0) {
                totalSpend += parseFloat(insights[0].spend);
            }
        }

        // 4. Retornar el cálculo formateado para que GHL lo procese
        res.status(200).json({
            total_spend: totalSpend.toFixed(2),
            period: "last_28_days",
            platform: "meta",
            location_id
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
