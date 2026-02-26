//Crea una instancia dentro de la base de datos para no tener múltiples requests a la base de datos
// revisado : ok
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.DATABASE_URL, process.env.DATABASE_SERVICE_KEY);
