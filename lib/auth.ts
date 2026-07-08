import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "fallback-secret";

export function signAdminToken(adminId: string) {
  return jwt.sign({ adminId, role: "admin" }, SECRET, { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): { adminId: string } | null {
  try {
    return jwt.verify(token, SECRET) as { adminId: string };
  } catch {
    return null;
  }
}

export async function getAdminFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const payload = verifyAdminToken(token);
  return payload?.adminId ?? null;
}
