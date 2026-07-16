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
