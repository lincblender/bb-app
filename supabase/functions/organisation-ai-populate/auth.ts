/// <reference lib="deno.ns" />

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bidblender-user-id, x-bidblender-tenant-id, x-bidblender-user-email",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export function getCallerMetadata(request: Request) {
  return {
    userId: request.headers.get("x-bidblender-user-id")?.trim() ?? "",
    tenantId: request.headers.get("x-bidblender-tenant-id")?.trim() ?? "",
    email: request.headers.get("x-bidblender-user-email")?.trim() ?? "",
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}
