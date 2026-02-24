import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.DATABASE_URL, 
  process.env.DATABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { data } = await supabase.from('auth_tokens').select('count');
  res.status(200).send("Database is awake");
}
