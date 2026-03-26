// api/meta/actions/get-ad-spend.js

//versión 1:1
import { getPlatformAccessToken } from '../../_auth-manager.js';

export default async function getAdSpend({ campaignIds }) {
  if (!campaignIds?.length) return 0;

  const token = await getPlatformAccessToken('meta');
  // Es fundamental incluir la versión (ej. v19.0) para la Marketing API
  const baseUrl = `https://graph.facebook.com/v25.0/`;
  let total = 0;

  for (const id of campaignIds) {
    try {
      // Usamos el nodo del ID de campaña + /insights
      // date_preset=last_28d garantiza el rango solicitado
      const url = `${baseUrl}${id}/insights?fields=spend&date_preset=last_28d`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const json = await response.json();

      if (!response.ok) {
        console.error(`Error en campaña ${id}:`, json.error?.message);
        continue;
      }

      // La respuesta de insights siempre es un arreglo llamado 'data'
      if (json.data && json.data.length > 0) {
        total += Number(json.data[0].spend || 0);
      }
    } catch (error) {
      console.error(`Fallo de conexión en campaña ${id}:`, error.message);
    }
  }

  return total;
}
