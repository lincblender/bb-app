export async function invokeSupabaseEdgeFunction(
  functionName: string,
  body: unknown,
  headers?: Record<string, string>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or ANON/PUBLISHABLE key");
  }

  const forwardedHeaders = headers ?? {};

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: forwardedHeaders.Authorization ?? `Bearer ${publishableKey}`,
      ...forwardedHeaders,
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const responseBody = (await response.json().catch(() => ({
    error: `Supabase edge function ${functionName} returned an invalid response.`,
  }))) as Record<string, unknown>;

  return { response, body: responseBody };
}
