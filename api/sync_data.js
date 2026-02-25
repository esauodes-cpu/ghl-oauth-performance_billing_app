export default async function handler(req, res) {
  // 1. Match the field name from your 'Manage Fields' UI
  const { locationId, service_key } = req.body; 

  if (service_key !== process.env.DATABASE_SERVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized: Service Key mismatch" });
  }

  try {
    // 2. Fetch stored refresh token
    const { data: row, error: dbError } = await supabase
      .from('auth_tokens')
      .select('refresh_token')
      .eq('company_id', process.env.COMPANY_ID)
      .single();

    if (dbError || !row) throw new Error("Could not find refresh token in database");

    // 3. Rotate tokens (Note the corrected endpoint)
    const tokenRes = await axios.post('https://services.leadconnectorhq.com', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token
    }));

    // 4. Update the DB with the NEW refresh token immediately
    await supabase.from('auth_tokens').upsert(
      { company_id: process.env.COMPANY_ID, refresh_token: tokenRes.data.refresh_token },
      { onConflict: 'company_id' }
    );

    // 5. Get Location Access Token (Note the corrected endpoint)
    const locRes = await axios.post('https://services.leadconnectorhq.com/oauth/locationToken', new URLSearchParams({
      companyId: process.env.COMPANY_ID,
      locationId: locationId
    }), { 
      headers: { 
        Authorization: `Bearer ${tokenRes.data.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded' 
      } 
    });

    // 6. Fetch Custom Values (Note corrected path and template literal)
    const customValues = await axios.get(`https://services.leadconnectorhq.com{locationId}/custom-values`, {
      headers: { 
        Authorization: `Bearer ${locRes.data.access_token}`, 
        Version: '2021-07-28' 
      }
    });

    res.status(200).json(customValues.data);
  } catch (err) {
    // Better error logging to help you see exactly which step failed
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
}
