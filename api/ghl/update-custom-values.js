import { getAccessToken } from '../auth/auth-manager.js';

export default async function handler(req, res) {
    // Validamos el Bearer Token que viene de GHL
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.CUSTOM_WEBHOOK_TOKEN}`) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { location_id, custom_values } = req.body;
    
    try {
        // Obtenemos el token de la subcuenta usando el auth-manager
        const subToken = await getAccessToken('ghl', { locationId: location_id });

        // 1. Obtener catálogo de Custom Values
        const catalogRes = await fetch(`https://services.leadconnectorhq.com{location_id}/customValues`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${subToken}`, 'Version': '2021-07-28' }
        });
        const { customValues: allValues } = await catalogRes.json();
        
        // 2. Match y Update
        if (custom_values && Array.isArray(custom_values)) {
            for (const item of custom_values) {
                const match = allValues.find(v => v.name === item.name);
        
                if (match) {
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
