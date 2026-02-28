import supabase from './supabase.js';

export default async function handler(req, res) {
  const platforms = ['meta']; // GHL no se "sincroniza" así, es el origen de los clientes.

  for (const platform of platforms) {
    // Aquí llamarías a los endpoints internos dinámicamente
    // Ejemplo simplificado para Meta:
    const syncUrl = `${process.env.PROJECT_URL}/api/${platform}/actions/sync-assets`;
    await fetch(syncUrl, { method: 'POST' });
  }

  res.status(200).json({ status: 'Sincronización iniciata' });
}
