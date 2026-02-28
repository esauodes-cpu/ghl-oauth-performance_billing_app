// api/meta/actions/get-ad-spend.js
import { getPlatformAccessToken } from '../../auth-manager.js';

export default async function getAdSpend({ campaignIds }) {
  if (!campaignIds?.length) return 0;

  const token = await getPlatformAccessToken('meta');

  const url = `https://graph.facebook.com/v19.0/`;

  const response = await fetch(
    `${url}?ids=${campaignIds.join(',')}&fields=insights{spend}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Meta API error: ${errText}`);
  }

  const data = await response.json();

  let total = 0;

  for (const id of campaignIds) {
    const spend = Number(data[id]?.insights?.data?.[0]?.spend || 0);
    total += spend;
  }

  return total;
}
