// In-memory rate limiter — per IP, resets elke minuut
// Voor productie op één server voldoende; bij meerdere instances: Redis gebruiken

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit = 10): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + 60_000 });
    return true; // toegestaan
  }

  if (entry.count >= limit) return false; // geblokkeerd

  entry.count++;
  return true;
}

export function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
