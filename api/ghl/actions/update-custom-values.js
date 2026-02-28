import { getPlatformAccessToken } from '../../auth-manager.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

export default async function handler(req, res) {
  try {
    // 🔐 1️⃣ Seguridad: validar CUSTOM_WEBHOOK_TOKEN
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2️⃣ Validar body
    const { locationId, updates } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates must be a non-empty array' });
    }

    // 🔑 3️⃣ Obtener token de subcuenta
    const token = await getPlatformAccessToken('ghl', { location_id: locationId });

    // 4️⃣ Obtener custom values actuales
    const currentRes = await fetch(
      `${GHL_BASE_URL}/locations/${locationId}/customValues`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28'
        }
      }
    );

    if (!currentRes.ok) {
      const errText = await currentRes.text();
      throw new Error(`Failed to fetch custom values: ${errText}`);
    }

    const { customValues } = await currentRes.json();

    if (!Array.isArray(customValues)) {
      throw new Error('Invalid custom values response');
    }

    // 5️⃣ Actualizar valores por nombre
    const results = [];

    for (const update of updates) {
      const match = customValues.find(cv => cv.name === update.name);

      if (!match) {
        results.push({
          name: update.name,
          status: 'not_found'
        });
        continue;
      }

      const putRes = await fetch(
        `${GHL_BASE_URL}/locations/${locationId}/customValues/${match.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: update.name,
            value: update.value
          })
        }
      );

      if (!putRes.ok) {
        const errText = await putRes.text();
        results.push({
          name: update.name,
          status: 'error',
          error: errText
        });
        continue;
      }

      const updated = await putRes.json();

      results.push({
        name: update.name,
        status: 'updated',
        data: updated
      });
    }

    // 6️⃣ Respuesta final
    return res.status(200).json({
      success: true,
      locationId,
      results
    });

  } catch (error) {
    console.error('[update-custom-values]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

//Formato esperado del webhook
//{
//"locationId": "abc123",
//"updates": [
//  { "name": "performance_fee", "value": 1500 },
//  { "name": "last_billing_date", "value": "2026-02-28" }
//]
//}
