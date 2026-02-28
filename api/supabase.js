// api/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.DATABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Crea una única instancia singleton de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
