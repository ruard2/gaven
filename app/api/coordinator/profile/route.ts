import { NextRequest, NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email } = await req.json();

  const trimmedName = name?.trim();
  if (!trimmedName) return NextResponse.json({ error: "Naam mag niet leeg zijn" }, { status: 400 });

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in" }, { status: 400 });
  }

  // E-mail is het inlogadres — mag niet botsen met een andere coordinator
  if (trimmedEmail !== coord.email.toLowerCase()) {
    const clash = await prisma.coordinator.findFirst({
      where: { email: trimmedEmail, id: { not: coord.id } },
      select: { id: true },
    });
    if (clash) return NextResponse.json({ error: "Dit e-mailadres is al in gebruik" }, { status: 409 });
  }

  const updated = await prisma.coordinator.update({
    where: { id: coord.id },
    data: { name: trimmedName, email: trimmedEmail },
    select: { name: true, email: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}
