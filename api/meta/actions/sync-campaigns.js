import supabase from '../../_supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

const HOURS_24 = 24 * 60 * 60;

export default async function syncCampaigns({ locationId }) {
  const token = await getPlatformAccessToken('meta');
  const businessId = process.env.META_AGENCY_PORTFOLIO_ID;

  const since = Math.floor(Date.now() / 1000) - HOURS_24;

  // obtener usuarios de la agencia
  const usersRes = await fetch(
    `https://graph.facebook.com/v21.0/${businessId}/business_users`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { data: users } = await usersRes.json();
  const agencyUserIds = new Set(users.map(u => u.id));

  // obtener cuentas del cliente
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('ad_account_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  const attributableCampaigns = [];

  for (const acc of accounts) {
    const accountId = acc.ad_account_id;

    // campañas nuevas (24h)
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v21.0/act_${accountId}/campaigns?filtering=[{"field":"created_time","operator":"GREATER_THAN","value":${since}}]`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data: campaigns } = await campaignsRes.json();

    for (const campaign of campaigns) {
      // obtener actor
      const activityRes = await fetch(
        `https://graph.facebook.com/v21.0/act_${accountId}/activities?item_id=${campaign.id}&event_type=campaign_creation`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { data: activities } = await activityRes.json();
      const actorId = activities?.[0]?.actor_id;

      if (agencyUserIds.has(actorId)) {
        attributableCampaigns.push({
          campaign_id: campaign.id,
          ad_account_id: accountId,
          location_id: locationId,
          platform: 'meta'
        });
      }
    }
  }

  // limpiar campañas previas
  await supabase
    .from('ad_campaigns')
    .delete()
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  if (attributableCampaigns.length) {
    await supabase.from('ad_campaigns').insert(attributableCampaigns);
  }

  return { campaigns: attributableCampaigns.length };
}
