import { getAccessToken } from '../auth/auth-manager.js';

export default async function handler(req, res) {
    // 1. Seguridad: Validar Bearer Token
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { location_id, custom_values } = req.body;
    if (!location_id) return res.status(400).json({ message: "location_id missing" });
    
    try {
        const subToken = await getAccessToken('ghl', { locationId: location_id });

        // 2. Obtener catálogo (CORRECCIÓN: URL de endpoint de GHL V2)
        const catalogRes = await fetch(`https://services.leadconnectorhq.com{location_id}/customValues`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${subToken}`, 'Version': '2021-07-28' }
        });
        const { customValues: allValues } = await catalogRes.json();
        
        if (custom_values && Array.isArray(custom_values)) {
            for (const item of custom_values) {
                const match = allValues.find(v => v.name === item.name);
        
                if (match) {
                    // 3. Update (CORRECCIÓN: URL de endpoint de GHL V2)
                    await fetch(`https://services.leadconnectorhq.com{location_id}/customValues/${match.id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${subToken}`,
                            'Content-Type': 'application/json',
                            'Version': '2021-07-28'
                        },
                        body: JSON.stringify({ name: match.name, value: item.value })
                    });
                }
            }
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
