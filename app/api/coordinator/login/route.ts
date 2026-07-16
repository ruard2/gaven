import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { blocked, retryAfterSeconds } = checkRateLimit(`coord:${ip}`);
  if (blocked) {
    const min = Math.ceil(retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer het over ${min} minuut${min === 1 ? "" : "en"} opnieuw.` },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Vul e-mail en wachtwoord in" }, { status: 400 });

  const coord = await prisma.coordinator.findFirst({
    where: { email: email.trim().toLowerCase(), status: "active" },
  });
  if (!coord?.passwordHash) {
    return NextResponse.json({ error: "Onbekend e-mailadres of account nog niet geactiveerd" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, coord.passwordHash);
  if (!valid) return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });

  resetRateLimit(`coord:${ip}`);
  const token = signCoordinatorToken(coord.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
