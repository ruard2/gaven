import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const resetToken = await prisma.coordinatorResetToken.findUnique({
    where: { token },
    include: { coordinator: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 404 });
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link is verlopen. Vraag een nieuwe herstelmail aan." }, { status: 410 });
  }
  if (resetToken.usedAt) {
    return NextResponse.json({ error: "Link is al gebruikt" }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.coordinator.update({
      where: { id: resetToken.coordinatorId },
      data: { passwordHash },
    }),
    prisma.coordinatorResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
