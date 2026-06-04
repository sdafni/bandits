export async function persistAuthSession(accessToken: string, refreshToken: string) {
  const response = await fetch("/auth/callback/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken }),
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not persist session.");
  }
}
