import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";
import { send } from "@/lib/email";

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
  const { token, password, name, vacancyIds, newFunction } = await req.json();
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const coord = await prisma.coordinator.findUnique({ where: { inviteToken: token } });
  if (!coord) return NextResponse.json({ error: "Ongeldige link" }, { status: 404 });
  if (coord.inviteExpiresAt && coord.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Link verlopen — vraag een nieuwe aan" }, { status: 410 });
  }

  const resolvedName = name?.trim() || coord.name;
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.coordinator.update({
    where: { id: coord.id },
    data: {
      passwordHash, status: "active", inviteToken: null, inviteExpiresAt: null,
      ...(resolvedName && { name: resolvedName }),
    },
  });

  // Eigen nieuwe functie aanmaken
  if (newFunction?.title) {
    await prisma.vacancy.create({
      data: {
        title: newFunction.title,
        category: newFunction.category || "Overig",
        organizationId: coord.organizationId,
        coordinatorId: coord.id,
        status: "open",
      },
    });
  }

  if (Array.isArray(vacancyIds) && vacancyIds.length > 0) {
    // Vrije vacatures direct koppelen
    await prisma.vacancy.updateMany({
      where: {
        id: { in: vacancyIds },
        organizationId: coord.organizationId,
        OR: [{ coordinatorId: null }, { coordinatorId: coord.id }],
      },
      data: { coordinatorId: coord.id },
    });

    // Bezette vacatures: stuur bevestigingsmail naar huidige coordinator
    const takenVacancies = await prisma.vacancy.findMany({
      where: {
        id: { in: vacancyIds },
        organizationId: coord.organizationId,
        coordinatorId: { not: null },
        NOT: { coordinatorId: coord.id },
      },
      include: {
        coordinator: { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    });

    for (const v of takenVacancies) {
      if (!v.coordinator) continue;
      const confirmToken = crypto.randomBytes(24).toString("hex");
      const appUrl = process.env.APP_URL || "https://www.gavenmatch.nl";
      await prisma.coCoordinator.upsert({
        where: { vacancyId_coordinatorId: { vacancyId: v.id, coordinatorId: coord.id } },
        update: { confirmToken, status: "pending" },
        create: { vacancyId: v.id, coordinatorId: coord.id, confirmToken, status: "pending" },
      });
      const confirmUrl = `${appUrl}/api/coordinator/co-confirm?token=${confirmToken}&action=confirm`;
      const rejectUrl = `${appUrl}/api/coordinator/co-confirm?token=${confirmToken}&action=reject`;
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
          <h2 style="color:#1d4ed8;margin-bottom:4px;">Nieuwe mede-coördinator aanvraag</h2>
          <p style="color:#6b7280;margin-top:0;">${v.organization.name}</p>
          <p>Hoi ${v.coordinator.name},</p>
          <p><strong>${resolvedName || coord.email}</strong> heeft zich aangemeld als mede-coördinator voor <strong>${v.title}</strong>.</p>
          <p>Klopt dit? Bevestig of wijs de aanvraag af:</p>
          <div style="margin:24px 0;display:flex;gap:12px;">
            <a href="${confirmUrl}" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Ja, bevestigen</a>
            <a href="${rejectUrl}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Nee, rapporteer</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;">Gavenmatch &bull; ${v.organization.name}</p>
        </div>`;
      await send(v.coordinator.email, `Aanvraag mede-coördinator: ${v.title}`, html, v.organization.name).catch(() => {});
    }
  }

  const jwt = signCoordinatorToken(coord.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, jwt, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
