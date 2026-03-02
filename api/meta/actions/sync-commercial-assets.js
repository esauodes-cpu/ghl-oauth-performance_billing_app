import supabase from '../../_supabase.js';
import { getPlatformAccessToken } from '../../auth-manager.js';

export default async function syncCommercialAssets({ locationId }) {
  const token = await getPlatformAccessToken('meta');
  const agencyId = process.env.META_AGENCY_PORTFOLIO_ID;

  // 1. Consultar a qué negocios de clientes tiene acceso la agencia
  const res = await fetch(
    `https://graph.facebook.com{agencyId}/client_businesses?fields=id,name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { data: apiBusinesses } = await res.json();
  if (!apiBusinesses) return { synced: 0 };

  // 2. Obtener los assets que YA tenemos en DB para este locationId
  const { data: dbAssets } = await supabase
    .from('commercial_assets')
    .select('asset_id')
    .eq('location_id', locationId)
    .eq('platform', 'meta');

  const dbIds = new Set(dbAssets?.map(a => a.asset_id) || []);

  // 3. Filtrar: Solo hacemos upsert de los negocios que coinciden con lo que Meta reporta
  // y que pertenecen a este cliente (basado en lo que ya está en DB o es nuevo)
  const toUpsert = apiBusinesses
    .filter(b => dbIds.has(b.id)) // Solo actualizamos los que este cliente ya tiene vinculados
    .map(b => ({
      asset_id: b.id,
      location_id: locationId,
      platform: 'meta',
      asset_name: b.name
    }));

  if (toUpsert.length) {
    await supabase.from('commercial_assets').upsert(toUpsert, { onConflict: 'asset_id' });
  }

  return { synced: toUpsert.length };
}
