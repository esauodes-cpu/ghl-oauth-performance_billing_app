// api/ghl/actions/update-custom-values.js
import { getPlatformAccessToken } from '../../auth-manager.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

export default async function handler(req, res) {
  try {
    // 🔐 Seguridad obligatoria
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { locationId, updates } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates must be a non-empty array' });
    }

    // 🔑 Obtener token GHL
    const token = await getPlatformAccessToken('ghl', { location_id: locationId });

    // 🧠 1️⃣ Extraer nombres únicos
    const names = [...new Set(updates.map(u => u.name))];

    // 📥 2️⃣ Obtener solo los custom values necesarios
    const currentRes = await fetch(
      `${process.env.PROJECT_URL}/api/ghl/actions/get-custom-values`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader // 🔁 reenviamos token
        },
        body: JSON.stringify({
          locationId,
          names
        })
      }
    );

    if (!currentRes.ok) {
      const errText = await currentRes.text();
      throw new Error(`Failed to fetch custom values: ${errText}`);
    }

    const { customValues } = await currentRes.json();

    // 🧠 3️⃣ Crear mapa name → id
    const idMap = new Map(customValues.map(cv => [cv.name, cv.id]));

    const results = [];

    // 🔁 4️⃣ Actualizar valores
    for (const update of updates) {
      const id = idMap.get(update.name);

      if (!id) {
        results.push({
          name: update.name,
          status: 'not_found'
        });
        continue;
      }

      const putRes = await fetch(
        `${GHL_BASE_URL}/locations/${locationId}/customValues/${id}`,
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

    return res.status(200).json({
      success: true,
      locationId,
      processed: updates.length,
      results
    });

  } catch (error) {
    console.error('[update-custom-values]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


// Sample Body Request
// {
//  "locationId": "string",
//  "updates": [
//    {
//      "name": "string",
//      "value": "any"
//    }
//  ]
// }
