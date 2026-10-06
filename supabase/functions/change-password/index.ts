import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return jsonResponse({ error: "Sign in with a DM account to change passwords." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Password change service is not configured." }, 500);
  }

  let body: { requestId?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const requestId = typeof body?.requestId === "string"
    ? body.requestId
    : typeof body?.requestId === "number" && Number.isSafeInteger(body.requestId)
    ? String(body.requestId)
    : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[1-9]\d*$/.test(requestId)) {
    return jsonResponse({ error: "A valid password request is required." }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return jsonResponse({ error: "Password must be between 8 and 128 characters." }, 400);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser(accessToken);
  if (authError || !user) {
    return jsonResponse({ error: "Your session is invalid or expired. Sign in again." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return jsonResponse({ error: `Could not verify DM permissions: ${profileError.message}` }, 500);
  }
  if (profile?.role !== "dm") {
    return jsonResponse({ error: "Only DMs can change account passwords." }, 403);
  }

  const { data: resetRequest, error: requestError } = await adminClient
    .from("password_reset_requests")
    .select("id, email, status")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) {
    return jsonResponse({ error: `Could not load the password request: ${requestError.message}` }, 500);
  }
  if (!resetRequest || resetRequest.status !== "pending") {
    return jsonResponse({ error: "This password request is no longer pending." }, 404);
  }

  let targetUser = null;
  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      return jsonResponse({ error: `Could not find the account: ${error.message}` }, 500);
    }
    targetUser = data.users.find((candidate) =>
      candidate.email?.toLowerCase() === resetRequest.email.toLowerCase()
    ) ?? null;
    if (targetUser || data.users.length < 1000) break;
  }
  if (!targetUser) {
    return jsonResponse({ error: "No account matches this password request." }, 404);
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    targetUser.id,
    { password },
  );
  if (passwordError) {
    return jsonResponse({ error: `Could not update the password: ${passwordError.message}` }, 400);
  }

  const { data: handledRequest, error: handledError } = await adminClient
    .from("password_reset_requests")
    .update({
      status: "handled",
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (handledError || !handledRequest) {
    return jsonResponse({
      error: handledError
        ? `Password changed, but the request could not be marked handled: ${handledError.message}`
        : "Password changed, but the request was already handled elsewhere.",
    }, 500);
  }

  return jsonResponse({ success: true });
});
