// Server-side validation for outbound webhook URLs (SSRF protection).
// Only allow https:// to known GoHighLevel/LeadConnector hostnames.
const ALLOWED_SUFFIXES = [
  ".leadconnectorhq.com",
  ".gohighlevel.com",
  ".msgsndr.com",
];

export function assertSafeWebhookUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid webhook URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must use https://");
  }
  const host = url.hostname.toLowerCase();
  const ok = ALLOWED_SUFFIXES.some(
    (s) => host === s.slice(1) || host.endsWith(s),
  );
  if (!ok) {
    throw new Error(
      "Webhook host not allowed. Use a GoHighLevel/LeadConnector URL.",
    );
  }
  return url;
}