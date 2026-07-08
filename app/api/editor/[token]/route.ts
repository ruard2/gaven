import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/editor/[token] — validate token, return org + vacancies
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      organization: {
        include: {
          vacancies: {
            where: { status: "active" },
            include: { qualityWeights: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!invite) return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 404 });

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Deze uitnodigingslink is verlopen" }, { status: 410 });
  }

  return NextResponse.json({
    org: {
      id: invite.organization.id,
      name: invite.organization.name,
      primaryColor: invite.organization.primaryColor,
    },
    vacancies: invite.organization.vacancies,
  });
}
