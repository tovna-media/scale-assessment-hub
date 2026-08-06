import { getRequestHeader } from "@tanstack/react-start/server";

const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUPS_PER_IP = 5;

// Cloudflare sets cf-connecting-ip on every request that reaches the origin
// and strips any client-supplied copy, so it can't be spoofed. Fall back to
// the standard proxy header for local dev / non-Cloudflare environments.
export function getClientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function checkAndRecordSignupAttempt(ip: string): Promise<{ allowed: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const windowStart = new Date(Date.now() - SIGNUP_WINDOW_MS).toISOString();

  const { count, error: countError } = await supabaseAdmin
    .from("signup_attempts")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", windowStart);

  if (countError) {
    // Fail open on infra errors — a rate-limit outage shouldn't block signup.
    console.error("[signup] rate limit check failed", countError);
    return { allowed: true };
  }

  if ((count ?? 0) >= MAX_SIGNUPS_PER_IP) {
    return { allowed: false };
  }

  const { error: insertError } = await supabaseAdmin.from("signup_attempts").insert({ ip });
  if (insertError) {
    console.error("[signup] rate limit record failed", insertError);
  }

  return { allowed: true };
}

export async function verifyTurnstileToken(
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[signup] TURNSTILE_SECRET_KEY not configured");
    return false;
  }
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch (e) {
    console.error("[signup] turnstile verify request failed", e);
    return false;
  }
}
