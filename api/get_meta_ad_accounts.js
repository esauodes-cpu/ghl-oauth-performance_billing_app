import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DATABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 🔥 PARSE ROBUSTO DEL BODY
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { location_id } = body;

    if (!location_id) {
      return res.status(400).json({ error: "Missing location_id" });
    }

    const { data, error } = await supabase
      .from("client_ad_accounts_database")
      .select("meta_ad_accounts")
      .eq("location_id", location_id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data.meta_ad_accounts || {});
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}
