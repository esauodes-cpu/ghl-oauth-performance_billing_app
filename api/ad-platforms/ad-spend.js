import { supabase } from '../utils/supabase.js';
import { getAccessToken } from '../auth/auth-manager.js';

export default async function handler(req, res) {
    // 1. Seguridad: Validar Bearer Token
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { location_id } = req.body;
    if (!location_id) return res.status(400).json({ message: "location_id missing" });

    try {
        const systemToken = await getAccessToken('meta');
        
        // Obtener campañas registradas para este cliente
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
            return res.json({ total_spend: 0, message: "No managed campaigns found" });
        }

        // Rango de 28 días
        const until = new Date().toISOString().split('T')[0];
        const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let totalSpend = 0;

        for (const camp of campaigns) {
            // CORRECCIÓN: URL completa y acceso a insights[0]
            const insightsRes = await fetch(
                `https://graph.facebook.com{camp.campaign_id}/insights?time_range={'since':'${since}','until':'${until}'}&fields=spend&access_token=${systemToken}`
            );
            const result = await insightsRes.json();
            
            // Meta devuelve un array 'data'. Si hay gasto, sumamos el primer elemento.
            if (result.data && result.data.length > 0) {
                totalSpend += parseFloat(result.data[0].spend);
            }
        }

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
