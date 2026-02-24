import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase
const supabase = createClient(process.env.DATABASE_URL, process.env.DATABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // 1. Modern way to get the 'code' (Fixes DEP0169)
  const { code } = req.query; 

  if (!code) {
    console.error("ERROR: No code received from HighLevel");
    return res.status(400).send("Installation failed: No code provided.");
  }

  try {
    // 2. Exchange code for tokens
    // We use URLSearchParams to ensure the format is exactly what GHL expects
    const params = new URLSearchParams();
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('user_type', 'Company'); // Required for Agency-level apps

    const response = await axios.post('https://services.leadconnectorhq.com', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log("SUCCESS: Tokens received from GHL");

    // 3. Save to Supabase
    const { error } = await supabase
      .from('auth_tokens')
      .upsert({ 
        company_id: process.env.COMPANY_ID, 
        refresh_token: response.data.refresh_token 
      });

    if (error) {
      console.error("SUPABASE ERROR:", error.message);
      throw error;
    }

    res.status(200).send("App installed and tokens saved! You can close this window.");

  } catch (err) {
    // This will print the EXACT reason for the 500 error in your Vercel logs
    console.error("DETAILED ERROR:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Token exchange failed", 
      details: err.response?.data || err.message 
    });
  }
}
