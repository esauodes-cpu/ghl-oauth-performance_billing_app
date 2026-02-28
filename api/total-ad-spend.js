import supabase from './supabase.js';

export default async function handler(req, res) {
  const { locationId } = req.query;

  // 1. Obtener campañas atribuibles de la DB
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select('campaign_id, platform, ad_account_id')
    .eq('location_id', locationId); // Relación vía commercial_assets

  let totalSpend = 0;

  // 2. Agrupar por plataforma y pedir gasto
  // Por brevedad, aquí llamarías a los archivos individuales de /actions
  // para obtener el gasto real de los últimos 28 días y filtrar por las IDs de la DB.
  
  res.status(200).json({ locationId, totalSpend_USD: totalSpend });
}
