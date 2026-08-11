// Password hashing for the org submitter. The submitter is deliberately NOT a
// Supabase Auth user (locked decision, see the organizations migration), so
// none of Supabase's own password handling applies here -- this is a small,
// self-contained hash instead of a new auth system. PBKDF2 via Web Crypto's
// crypto.subtle works in both Node and the Cloudflare/nitro runtime this app
// deploys to, with no native bindings and no new dependency (the same API is
// already used for token generation in checkout-completion.server.ts).

// Cloudflare Workers' crypto.subtle caps PBKDF2 at 100,000 iterations
// (higher counts throw at runtime) -- this app deploys there, so 100,000 is
// the ceiling, not just a preference.
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toHex(new Uint8Array(derived));
}

/** Stored format: `iterations:saltHex:hashHex`. */
export async function hashSubmitterPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${toHex(salt)}:${hash}`;
}

export async function verifySubmitterPassword(password: string, stored: string): Promise<boolean> {
  const [iterationsStr, saltHex, hashHex] = stored.split(":");
  const iterations = Number(iterationsStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const candidate = await derive(password, fromHex(saltHex), iterations);
  if (candidate.length !== hashHex.length) return false;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
