import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// ✅ Inicialización usando TUS variables
const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DATABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { locationId, service_key } = req.body.data;

  // Seguridad
  if (service_key !== process.env.DATABASE_SERVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized: Service Key mismatch" });
  }

  try {
    // Obtener refresh token
    const { data: row, error: dbError } = await supabase
      .from("auth_tokens")
      .select("refresh_token")
      .eq("company_id", process.env.COMPANY_ID)
      .single();

    if (dbError || !row) {
      throw new Error("Could not find refresh token in database");
    }

    // Renovar Agency Token
    const tokenRes = await axios.post(
      "https://services.leadconnectorhq.com/oauth/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
      })
    );

    // Guardar nuevo refresh token
    await supabase.from("auth_tokens").upsert(
      {
        company_id: process.env.COMPANY_ID,
        refresh_token: tokenRes.data.refresh_token,
      },
      { onConflict: "company_id" }
    );

    // Obtener Location Token
    const locRes = await axios.post(
      "https://services.leadconnectorhq.com/oauth/locationToken",
      new URLSearchParams({
        companyId: process.env.COMPANY_ID,
        locationId: locationId,
      }),
      {
        headers: {
          Version: "2021-07-28",
          Authorization: `Bearer ${tokenRes.data.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // Obtener Custom Values
    const customValues = await axios.get(
      `https://services.leadconnectorhq.com/locations/${locationId}/custom-values`,
      {
        headers: {
          Authorization: `Bearer ${locRes.data.access_token}`,
          Version: "2021-07-28",
        },
      }
    );

    return res.status(200).json(customValues.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data || err.message });
  }
}
