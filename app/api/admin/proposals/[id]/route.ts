import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { extractSpecificRequirements } from "@/lib/specific";

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

  const data = JSON.parse(proposal.proposedData) as Record<string, string | boolean>;
  const isNewVacancy = data.isNewVacancy === true;

  if (action === "approve") {
    if (isNewVacancy) {
      // Activate the pending vacancy without overwriting its data
      await prisma.vacancy.update({ where: { id: proposal.vacancyId }, data: { status: "active" } });
    } else {
      const { title, shortDescription, whyValuable, concreteTasks, firstStep } = data as Record<string, string>;
      const current = await prisma.vacancy.findUnique({ where: { id: proposal.vacancyId } });
      const specificRequirements = await extractSpecificRequirements({
        title: title ?? current?.title ?? "",
        category: current?.category,
        shortDescription: shortDescription ?? current?.shortDescription ?? "",
        whyValuable: whyValuable ?? current?.whyValuable ?? undefined,
        concreteTasks: concreteTasks ?? current?.concreteTasks ?? undefined,
        longDescription: current?.longDescription ?? undefined,
      });
      await prisma.vacancy.update({
        where: { id: proposal.vacancyId },
        data: {
          ...(title && { title }),
          ...(shortDescription && { shortDescription }),
          ...(whyValuable !== undefined && { whyValuable }),
          ...(concreteTasks !== undefined && { concreteTasks }),
          ...(firstStep !== undefined && { firstStep }),
          specificRequirements: JSON.stringify(specificRequirements),
        },
      });
    }
    await prisma.vacancyProposal.update({ where: { id }, data: { status: "approved" } });
  } else {
    await prisma.vacancyProposal.update({ where: { id }, data: { status: "rejected" } });
    // Delete the pending vacancy placeholder if this was a new-vacancy proposal
    if (isNewVacancy) {
      await prisma.vacancy.delete({ where: { id: proposal.vacancyId } });
    }
  }

  return NextResponse.json({ ok: true });
}
