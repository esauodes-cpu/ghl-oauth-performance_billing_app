// api/meta/actions/sync-commercial-assets.js
import supabase from '../../supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

export default async function syncCommercialAssets({ locationId }) {
  const token = await getPlatformAccessToken('meta');
  const agencyBusinessId = process.env.META_AGENCY_PORTFOLIO_ID;

  // Obtener businesses de clientes donde somos partner
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${agencyBusinessId}/client_businesses`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Meta client_businesses error: ${errText}`);
  }

  const { data: businesses } = await res.json();

  // IDs desde API
  const apiIds = businesses.map(b => b.id);

  // Obtener assets actuales

  const { data: dbAssets } = await supabase
    .from('commercial_assets')
    .select('asset_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  const dbIds = dbAssets.map(a => a.asset_id);

  const toInsert = apiIds.filter(id => !dbIds.includes(id));
  const toDelete = dbIds.filter(id => !apiIds.includes(id));

  // Insertar nuevos
  if (toInsert.length) {
    await supabase.from('commercial_assets').insert(
      toInsert.map(id => ({
        asset_id: id,
        location_id: locationId,
        platform: 'meta'
      }))
    );
  }

  // Eliminar revocados
  if (toDelete.length) {
    await supabase
      .from('commercial_assets')
      .delete()
      .in('asset_id', toDelete);
  }

  return {
    added: toInsert.length,
    removed: toDelete.length
  };
}
