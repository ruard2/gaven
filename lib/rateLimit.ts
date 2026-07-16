const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minuten

export function checkRateLimit(ip: string): { blocked: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { blocked: true, remaining: 0, retryAfterSeconds };
  }

  return { blocked: false, remaining: MAX_ATTEMPTS - entry.count, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

// Compat helpers voor bestaande OpenAI-routes
const openAiAttempts = new Map<string, { count: number; resetAt: number }>();

export function getIp(req: { headers: { get: (k: string) => string | null } }): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function rateLimit(ip: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = openAiAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    openAiAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
