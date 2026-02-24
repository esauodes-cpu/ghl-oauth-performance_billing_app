import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(process.env.DATABASE_URL, process.env.PASSWORD);

export default async function handler(req, res) {
  const { locationId, password } = req.body;

  // Security Check
  if (password !== process.env.PASSWORD) return res.status(401).send("Unauthorized");

  try {
    // 1. Get current Refresh Token from Supabase
    const { data: row } = await supabase.from('auth_tokens').select('refresh_token').eq('company_id', process.env.COMPANY_ID).single();

    // 2. Get New Agency Access Token (Rotation)
    const tokenRes = await axios.post('https://services.leadconnectorhq.com', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token
    }));

    // 3. IMMEDIATELY save the new rotated refresh token
    await supabase.from('auth_tokens').upsert({ company_id: process.env.COMPANY_ID, refresh_token: tokenRes.data.refresh_token });

    // 4. Get Location Access Token
    const locRes = await axios.post('https://services.leadconnectorhq.com', new URLSearchParams({
      companyId: process.env.COMPANY_ID,
      locationId: locationId
    }), { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });

    // 5. Fetch Custom Values from the Sub-account
    const customValues = await axios.get(`https://services.leadconnectorhq.com{locationId}/customValues`, {
      headers: { Authorization: `Bearer ${locRes.data.access_token}`, Version: '2021-07-28' }
    });

    res.status(200).json(customValues.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
