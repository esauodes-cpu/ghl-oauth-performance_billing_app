import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.DATABASE_URL,
      process.env.DATABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      ping: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
