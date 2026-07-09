import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "coordinator-secret";
const COOKIE = "coordinator_token";

export function signCoordinatorToken(coordinatorId: string): string {
  return jwt.sign({ coordinatorId }, SECRET, { expiresIn: "30d" });
}

export async function getCoordinatorFromCookies(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const payload = jwt.verify(token, SECRET) as { coordinatorId: string };
    return payload.coordinatorId;
  } catch {
    return null;
  }
}

export async function requireCoordinator() {
  const id = await getCoordinatorFromCookies();
  if (!id) return null;
  return prisma.coordinator.findUnique({
    where: { id },
    include: { organization: true },
  });
}

export { COOKIE as COORDINATOR_COOKIE };
