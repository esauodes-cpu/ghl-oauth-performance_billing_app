import { supabase } from './supabase.js';

export async function getValidAgencyToken() {
    const { data: auth } = await supabase.from('agency_auth').select('*').eq('company_id', process.env.COMPANY_ID).single();
    if (!auth) throw new Error("Agencia no autenticada.");

    if (new Date(auth.expires_at).getTime() - Date.now() < 10 * 60 * 1000) {
        const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: auth.refresh_token
            })
        });
        const data = await res.json();
        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        await supabase.from('agency_auth').update({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt
        }).eq('company_id', process.env.COMPANY_ID);
        return data.access_token;
    }
    return auth.access_token;
