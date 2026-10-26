export async function readError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (data && typeof data.error === "string" && data.error.trim()) return data.error;
  return "The request failed. Try again.";
}
