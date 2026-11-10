import { createPandaClient } from './panda-client';
export type { PandaResult } from './panda-client';

const client = createPandaClient({
  fetch: (url, options) => fetch(url, options),
  getToken: () => process.env.PANDASCORE_API_KEY,
});

export function pandaResult<T>(path: string, revalidate = 60) {
  return client.request<T>(path, revalidate);
}

export async function panda<T>(path: string, revalidate = 60): Promise<T | null> {
  return (await pandaResult<T>(path, revalidate)).data;
}
