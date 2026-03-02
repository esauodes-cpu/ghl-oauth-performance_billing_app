// api/total-ad-spend.js
import supabase from './_supabase.js';

export default async function handler(req, res) {
  try {
    // 🔐 Seguridad webhook
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }

    // 🔄 Asegurar DB actualizada antes del cálculo
    // Llama a sync-all para sincronizar activos, cuentas y campañas
    await fetch(`${process.env.PROJECT_URL}/api/sync-all`, {
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    // 1️⃣ Obtener campañas atribuibles
    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select('campaign_id, platform')
      .eq('location_id', locationId);

    if (error) throw error;

    if (!campaigns.length) {
      return res.status(200).json({
        locationId,
        totalSpend: 0,
        byPlatform: {}
      });
    }

    // 2️⃣ Agrupar campañas por plataforma
    const campaignsByPlatform = {};

    for (const c of campaigns) {
      if (!campaignsByPlatform[c.platform]) {
        campaignsByPlatform[c.platform] = [];
      }
      campaignsByPlatform[c.platform].push(c.campaign_id);
    }

    const spendByPlatform = {};
    let totalSpend = 0;

    // 3️⃣ Iterar plataformas dinámicamente
    for (const platform of Object.keys(campaignsByPlatform)) {
      try {
        const module = await import(`./${platform}/actions/get-ad-spend.js`);
        const getAdSpend = module.default;

        const spend = await getAdSpend({
          campaignIds: campaignsByPlatform[platform]
        });

        spendByPlatform[platform] = spend;
        totalSpend += spend;

      } catch (err) {
        console.error(`[total-ad-spend] Failed for ${platform}`, err);
        spendByPlatform[platform] = 0;
      }
    }

    return res.status(200).json({
      success: true,
      locationId,
      totalSpend,
      byPlatform: spendByPlatform
    });

  } catch (error) {
    console.error('[total-ad-spend]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
