// api/ghl/actions/get-custom-values.js
import { getPlatformAccessToken } from '../../_auth-manager.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

export default async function handler(req, res) {
  try {
    // 🔐 Seguridad obligatoria
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { locationId, names } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }

    // 🔑 Obtener token GHL
    const token = await getPlatformAccessToken('ghl', { location_id: locationId });

    // 📥 Obtener custom values
    const ghlRes = await fetch(
      `${GHL_BASE_URL}/locations/${locationId}/customValues`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28'
        }
      }
    );

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      throw new Error(`Failed to fetch custom values: ${errText}`);
    }

    const { customValues } = await ghlRes.json();

    if (!Array.isArray(customValues)) {
      throw new Error('Invalid custom values response');
    }

    // 🔍 Filtrar si se especifican nombres
    let resultValues = customValues;

    if (Array.isArray(names) && names.length > 0) {
      const nameSet = new Set(names);
      resultValues = customValues.filter(cv => nameSet.has(cv.name));
    }

    return res.status(200).json({
      success: true,
      locationId,
      count: resultValues.length,
      customValues: resultValues
    });

  } catch (error) {
    console.error('[get-custom-values]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

//Sample Body Request
//{
//  "locationId": "string",
//  "names": ["optional", "array", "of", "names"]
//}
