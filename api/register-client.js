// api/register-client.js
import supabase from './_supabase.js';

/**
 * POST /api/register-client
 *
 * Registra un nuevo cliente y sus activos comerciales de Meta
 * durante el proceso de onboarding.
 *
 * Flujo:
 *   1. Upsert en `clients` (location_id + client_name)
 *   2. Upsert en `commercial_assets` (portfolio_id como activo Meta)
 *   3. Upsert en `ad_accounts` (cada ad account vinculada al portfolio)
 *
 * Body:
 *   locationId (string, required) — ID de la subcuenta de GHL
 *   clientName (string, required) — Nombre del cliente
 *   portfolioId (string, required) — Business Portfolio ID de Meta
 *   adAccountIds (string | string[], required) — ID(s) de cuenta(s) publicitaria(s)
 *   currency (string, optional) — Moneda de las cuentas (default: "USD")
 */
export default async function handler(req, res) {
  try {
    // 🔐 Seguridad webhook
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { locationId, clientName, portfolioId, adAccountIds, currency } = req.body || {};

    // Validaciones
    if (!locationId) return res.status(400).json({ error: 'locationId is required' });
    if (!clientName) return res.status(400).json({ error: 'clientName is required' });
    if (!portfolioId) return res.status(400).json({ error: 'portfolioId is required' });
    if (!adAccountIds) return res.status(400).json({ error: 'adAccountIds is required' });

    // Normalizar adAccountIds a array
    const accountIds = Array.isArray(adAccountIds) ? adAccountIds : [adAccountIds];

    if (accountIds.length === 0) {
      return res.status(400).json({ error: 'adAccountIds must contain at least one ID' });
    }

    // 1️⃣ Upsert cliente
    const { error: clientError } = await supabase
      .from('clients')
      .upsert(
        { location_id: locationId, client_name: clientName },
        { onConflict: 'location_id' }
      );

    if (clientError) throw new Error(`Client upsert failed: ${clientError.message}`);

    // 2️⃣ Upsert activo comercial (Business Portfolio)
    const { error: assetError } = await supabase
      .from('commercial_assets')
      .upsert(
        {
          asset_id: portfolioId,
          location_id: locationId,
          platform: 'meta',
          asset_name: `${clientName} - Portfolio`
        },
        { onConflict: 'asset_id' }
      );

    if (assetError) throw new Error(`Asset upsert failed: ${assetError.message}`);

    // 3️⃣ Upsert cuentas publicitarias
    const adRows = accountIds.map(id => ({
      ad_account_id: String(id).replace(/^act_/, ''), // Limpiar prefijo act_ si viene
      asset_id: portfolioId,
      location_id: locationId,
      platform: 'meta',
      currency: currency || 'USD'
    }));

    const { error: adError } = await supabase
      .from('ad_accounts')
      .upsert(adRows, { onConflict: 'ad_account_id' });

    if (adError) throw new Error(`Ad accounts upsert failed: ${adError.message}`);

    return res.status(200).json({
      success: true,
      locationId,
      clientName,
      portfolioId,
      adAccountsRegistered: accountIds.length
    });

  } catch (error) {
    console.error('[register-client]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
