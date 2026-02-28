import { getAccessToken } from '../../auth-manager.js';

export const getAdSpend = async (adAccountId) => {
  const token = await getAccessToken('meta');
  const params = new URLSearchParams({
    fields: 'campaign_id,spend',
    date_preset: 'last_28d',
    level: 'campaign',
    access_token: token
  });

  const response = await fetch(`https://graph.facebook.com{adAccountId}/insights?${params}`);
  const data = await response.json();
  
  return data.data; // [{ campaign_id: "...", spend: "123.45" }]
};
