import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DATABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    // 1. Method Validation
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 2. Robust Body Parsing
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { location_id } = body;

    if (!location_id) {
      return res.status(400).json({ error: "Missing location_id" });
    }

    // 3. Database Query
    // .maybeSingle() is safer than .single() because it returns null 
    // instead of an error if no record is found.
    const { data, error } = await supabase
      .from("client_ad_accounts_database")
      .select("meta_ad_accounts")
      .eq("location_id", location_id)
      .maybeSingle(); 

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // 4. Return Data
    // If data is null (location not found), return empty object to prevent GHL crash
    if (!data) {
      return res.status(200).json({});
    }

    // Return the JSONB content directly
    return res.status(200).json(data.meta_ad_accounts || {});

  } catch (err) {
    console.error("Server Error:", err.message);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
