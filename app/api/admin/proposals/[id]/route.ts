import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";

// PATCH — approve or reject a proposal
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const proposal = await prisma.vacancyProposal.findFirst({
    where: { id, vacancy: { organization: { adminId } } },
  });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { action } = await req.json(); // "approve" | "reject"

  if (action === "approve") {
    const data = JSON.parse(proposal.proposedData) as Record<string, string>;
    const { title, shortDescription, whyValuable, concreteTasks, firstStep } = data;

    await prisma.vacancy.update({
      where: { id: proposal.vacancyId },
      data: {
        ...(title && { title }),
        ...(shortDescription && { shortDescription }),
        ...(whyValuable !== undefined && { whyValuable }),
        ...(concreteTasks !== undefined && { concreteTasks }),
        ...(firstStep !== undefined && { firstStep }),
      },
    });

    await prisma.vacancyProposal.update({ where: { id }, data: { status: "approved" } });
  } else {
    await prisma.vacancyProposal.update({ where: { id }, data: { status: "rejected" } });
  }

  return NextResponse.json({ ok: true });
}
