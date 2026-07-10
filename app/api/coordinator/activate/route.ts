import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });

  const coord = await prisma.coordinator.findUnique({ where: { inviteToken: token } });
  if (!coord) return NextResponse.json({ error: "Ongeldige link" }, { status: 404 });
  if (coord.inviteExpiresAt && coord.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Link verlopen" }, { status: 410 });
  }

  const orgVacancies = await prisma.vacancy.findMany({
    where: { organizationId: coord.organizationId },
    select: { id: true, title: true, category: true, coordinatorId: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    name: coord.name,
    email: coord.email,
    alreadyActive: coord.status === "active",
    orgVacancies: orgVacancies.map((v) => ({
      id: v.id,
      title: v.title,
      category: v.category,
      assigned: v.coordinatorId === coord.id,
      taken: v.coordinatorId !== null && v.coordinatorId !== coord.id,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { token, password, name, vacancyIds } = await req.json();
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const coord = await prisma.coordinator.findUnique({ where: { inviteToken: token } });
  if (!coord) return NextResponse.json({ error: "Ongeldige link" }, { status: 404 });
  if (coord.inviteExpiresAt && coord.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Link verlopen — vraag een nieuwe aan" }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.coordinator.update({
    where: { id: coord.id },
    data: {
      passwordHash, status: "active", inviteToken: null, inviteExpiresAt: null,
      ...(name?.trim() && { name: name.trim() }),
    },
  });

  if (Array.isArray(vacancyIds) && vacancyIds.length > 0) {
    await prisma.vacancy.updateMany({
      where: {
        id: { in: vacancyIds },
        organizationId: coord.organizationId,
        OR: [{ coordinatorId: null }, { coordinatorId: coord.id }],
      },
      data: { coordinatorId: coord.id },
    });
  }

  const jwt = signCoordinatorToken(coord.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, jwt, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
