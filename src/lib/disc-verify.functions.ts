import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SHEET_ID = "1Nog2w9gSUi5U7Wjfi38O9bvDkL03KFlGNF6dRpkO9G8";
const TAB_NAME = "Key Codes";

// Sign a JWT for Google service account auth (RS256) using Web Crypto.
function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const stripped = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(stripped);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export const verifyDiscCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const code = String(data?.code ?? "").trim();
    if (!code) throw new Error("Code required");
    return { code };
  })
  .handler(async ({ data }) => {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    let sa: { client_email: string; private_key: string };
    try {
      sa = JSON.parse(raw);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    if (!sa.client_email || !sa.private_key) {
      throw new Error("Service account JSON missing client_email/private_key");
    }

    const token = await getAccessToken(sa);
    const range = encodeURIComponent(`${TAB_NAME}!A:Z`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text();
      console.error("Sheets read failed", res.status, body);
      return { valid: false as const, reason: "lookup_failed" as const };
    }
    const json = (await res.json()) as { values?: string[][] };
    const rows = json.values ?? [];
    if (rows.length < 2) return { valid: false as const, reason: "not_found" as const };
    const header = rows[0].map((h) => (h ?? "").trim().toLowerCase());
    const codeIdx = header.indexOf("key code");
    const statusIdx = header.indexOf("status");
    if (codeIdx === -1 || statusIdx === -1) {
      console.error("Sheet missing required columns", header);
      return { valid: false as const, reason: "lookup_failed" as const };
    }
    const needle = data.code.trim().toLowerCase();
    for (let i = 1; i < rows.length; i++) {
      const cell = (rows[i][codeIdx] ?? "").trim().toLowerCase();
      if (cell === needle) {
        const status = (rows[i][statusIdx] ?? "").trim();
        if (status.toLowerCase() === "assigned") {
          return { valid: true as const };
        }
        return { valid: false as const, reason: "not_assigned" as const };
      }
    }
    return { valid: false as const, reason: "not_found" as const };
  });