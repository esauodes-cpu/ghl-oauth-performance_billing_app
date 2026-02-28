// api/sync-all.js
import supabase from './_supabase.js';

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1️⃣ Obtener clientes
    const { data: clients, error } = await supabase
      .from('clients')
      .select('location_id');

    if (error) throw error;

    const results = [];

    for (const client of clients) {
      const locationId = client.location_id;

      // 2️⃣ Obtener plataformas activas del cliente
      const { data: assets, error: assetsError } = await supabase
        .from('commercial_assets')
        .select('platform')
        .eq('location_id', locationId);

      if (assetsError) throw assetsError;

      const platforms = [...new Set(assets.map(a => a.platform))];

      for (const platform of platforms) {
        try {
          // Import dinámico SIN bypass silencioso
          const syncAccounts = await import(`./${platform}/actions/sync-ad-accounts.js`)
            .then(m => m.default);

          const syncCampaigns = await import(`./${platform}/actions/sync-campaigns.js`)
            .then(m => m.default);

          await syncAccounts({ locationId });
          await syncCampaigns({ locationId });

          results.push({
            locationId,
            platform,
            status: 'ok'
          });

        } catch (err) {
          console.error(`[sync-all] ${platform} failed for ${locationId}`, err);

          results.push({
            locationId,
            platform,
            status: 'error',
            message: err.message
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('[sync-all]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
