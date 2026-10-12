import axios from 'axios';
export function createHttpClient(baseURL) {
  return axios.create({
    baseURL: baseURL.replace(/\/+$/, '') + '/',
    timeout: 5000,
    headers: { Accept: 'application/json' },
  });
}
export async function readHealth(client, service, signal) {
  const { data } = await client.get('health', { signal });
  if (data?.service !== service || data?.status !== 'ok')
    throw new Error('Invalid health response');
  return data;
}
