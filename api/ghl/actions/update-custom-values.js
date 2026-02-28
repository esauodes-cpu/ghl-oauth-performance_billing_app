import { getAccessToken } from '../../auth-manager.js';

export default async function handler(req, res) {
  const { locationId, updates } = req.body; // updates: [{ name: 'fee', value: 100 }]
  const token = await getAccessToken('ghl', locationId);

  // 1. Obtener valores actuales para encontrar IDs por nombre
  const currentRes = await fetch(`https://services.leadconnectorhq.com{locationId}/customValues`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28' }
  });
  const { customValues } = await currentRes.json();

  // 2. Hacer match y actualizar
  const results = [];
  for (const update of updates) {
    const match = customValues.find(cv => cv.name === update.name);
    if (match) {
      const putRes = await fetch(`https://services.leadconnectorhq.com{locationId}/customValues/${match.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: update.name, value: update.value })
      });
      results.push(await putRes.json());
    }
  }

  res.status(200).json(results);
}
