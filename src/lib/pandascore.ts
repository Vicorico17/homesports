export async function panda<T>(path: string, revalidate = 60): Promise<T | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;
  try {
    const response = await fetch(`https://api.pandascore.co/${path}`, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate } });
    return response.ok ? await response.json() as T : null;
  } catch (error) {
    console.error(`PandaScore request failed: ${path}`, error);
    return null;
  }
}
