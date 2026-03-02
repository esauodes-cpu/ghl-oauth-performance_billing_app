import supabase from '../../_supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

const HOURS_24 = 24 * 60 * 60;

export default async function syncCampaigns({ locationId }) {
  const token = await getPlatformAccessToken('meta');
  const agencyId = process.env.META_AGENCY_PORTFOLIO_ID;
  const since = Math.floor(Date.now() / 1000) - HOURS_24;

  // 1. Obtener staff de la agencia para validar atribución (actor_id)
  const usersRes = await fetch(
    `https://graph.facebook.com{agencyId}/business_users?fields=id`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data: users } = await usersRes.json();
  const agencyUserIds = new Set(users?.map(u => u.id) || []);

  // 2. Obtener las cuentas publicitarias de este cliente
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('ad_account_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  const attributableCampaigns = [];

  for (const acc of accounts) {
    const accountId = acc.ad_account_id;

    // 3. Consultar campañas creadas recientemente en esta cuenta
    const campaignsRes = await fetch(
      `https://graph.facebook.com{accountId}/campaigns?fields=id,name&filtering=[{"field":"created_time","operator":"GREATER_THAN","value":${since}}]`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { data: campaigns } = await campaignsRes.json();
    if (!campaigns) continue;

    for (const campaign of campaigns) {
      // 4. Verificar el 'actor_id' para confirmar que la agencia creó la campaña
      const activityRes = await fetch(
        `https://graph.facebook.com{accountId}/activities?item_id=${campaign.id}&event_type=campaign_creation&fields=actor_id`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { data: activities } = await activityRes.json();
      const actorId = activities?.[0]?.actor_id;

      if (agencyUserIds.has(actorId)) {
        attributableCampaigns.push({
          campaign_id: campaign.id,
          ad_account_id: accountId,
          location_id: locationId,
          platform: 'meta',
          campaign_name: campaign.name
        });
      }
    }
  }

  // 5. Upsert: Agregamos las nuevas sin borrar las históricas.
  if (attributableCampaigns.length) {
    const { error } = await supabase
      .from('ad_campaigns')
      .upsert(attributableCampaigns, { onConflict: 'campaign_id' });
    if (error) throw error;
  }

  return { newSynced: attributableCampaigns.length };
}
