import supabase from '../../supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

export default async function syncAdAccounts({ locationId }) {
  const token = await getPlatformAccessToken('meta');
  const businessId = process.env.META_AGENCY_PORTFOLIO_ID;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${businessId}/client_ad_accounts`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { data } = await res.json();
  const apiIds = data.map(a => a.id);

  const { data: dbAccounts } = await supabase
    .from('ad_accounts')
    .select('ad_account_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  const dbIds = dbAccounts.map(a => a.ad_account_id);

  const toInsert = apiIds.filter(id => !dbIds.includes(id));
  const toDelete = dbIds.filter(id => !apiIds.includes(id));

  if (toInsert.length) {
    await supabase.from('ad_accounts').insert(
      toInsert.map(id => ({
        ad_account_id: id,
        location_id: locationId,
        platform: 'meta'
      }))
    );
  }

  if (toDelete.length) {
    await supabase.from('ad_accounts')
      .delete()
      .in('ad_account_id', toDelete);
  }

  return { added: toInsert.length, removed: toDelete.length };
}
