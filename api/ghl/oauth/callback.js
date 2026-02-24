import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.DATABASE_URL, 
  process.env.DATABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { code } = req.query;

  try {
    // 1. Exchange code for tokens
    const response = await axios.post('https://services.leadconnectorhq.com', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code
    }));

    // 2. Save the Agency Refresh Token to Supabase
    const { error } = await supabase
      .from('auth_tokens')
      .upsert({ 
        company_id: process.env.COMPANY_ID, 
        refresh_token: response.data.refresh_token 
      });

    if (error) throw error;
    res.status(200).send("App installed and tokens saved! You can close this window.");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
