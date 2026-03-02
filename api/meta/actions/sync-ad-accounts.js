import supabase from '../../_supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

export default async function syncAdAccounts({ locationId }) {
  const token = await getPlatformAccessToken('meta');

  // 1. Obtener los Business IDs (assets) vinculados a este cliente
  const { data: assets } = await supabase
    .from('commercial_assets')
    .select('asset_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  if (!assets?.length) return { synced: 0 };

  const allApiAccounts = [];

  // 2. Por cada Business Portfolio, pedir sus cuentas publicitarias
  for (const asset of assets) {
    const res = await fetch(
      `https://graph.facebook.com{asset.asset_id}/client_ad_accounts?fields=id,name,currency`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const { data } = await res.json();
    if (data) {
      data.forEach(acc => {
        allApiAccounts.push({
          ad_account_id: acc.id.replace('act_', ''), // Limpiar el prefijo 'act_'
          asset_id: asset.asset_id,
          location_id: locationId,
          platform: 'meta',
          currency: acc.currency
        });
      });
    }
  }

  // 3. Upsert: Si la cuenta ya existe, actualiza; si es nueva, la añade
  if (allApiAccounts.length) {
    const { error } = await supabase
      .from('ad_accounts')
      .upsert(allApiAccounts, { onConflict: 'ad_account_id' });
    if (error) throw error;
  }

  return { synced: allApiAccounts.length };
}
