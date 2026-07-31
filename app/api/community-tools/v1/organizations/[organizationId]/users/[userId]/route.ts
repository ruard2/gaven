import { prisma } from "@/lib/db";
import { verifyCommunityToolsManagementRequest } from "@/lib/communityToolsManagement";

export const dynamic = "force-dynamic";

async function context(request: Request, organizationId: string) {
  if (!verifyCommunityToolsManagementRequest(request)) return { error: 401 as const };
  const organization = await prisma.organization.findUnique({
    where: { communityToolsOrganizationId: organizationId },
    select: { id: true, adminId: true },
  });
  return organization ? { organization } : { error: 404 as const };
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/community-tools/v1/organizations/[organizationId]/users/[userId]">,
) {
  const { organizationId, userId } = await params;
  const access = await context(request, organizationId);
  if ("error" in access) return Response.json({ error: "Geen toegang." }, { status: access.error });
  const body = await request.json() as { name?: string; email?: string; status?: string };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!name || !email) return Response.json({ error: "Naam en e-mail zijn verplicht." }, { status: 400 });
  const [kind, id] = splitId(userId);
  try {
    if (kind === "participant") {
      const found = await prisma.participant.findFirst({ where: { id, organizationId: access.organization.id } });
      if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
      await prisma.participant.update({ where: { id }, data: { name, email } });
    } else if (kind === "coordinator") {
      const found = await prisma.coordinator.findFirst({ where: { id, organizationId: access.organization.id } });
      if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
      await prisma.coordinator.update({ where: { id }, data: { name, email, status: body.status === "active" ? "active" : "invited" } });
    } else if (kind === "central-admin") {
      const found = await prisma.communityToolsAccount.findFirst({ where: { id, organizationId: access.organization.id } });
      if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
      await prisma.communityToolsAccount.update({ where: { id }, data: { name, email } });
    } else if (kind === "local-admin" && id === access.organization.adminId) {
      await prisma.admin.update({ where: { id }, data: { email } });
    } else return Response.json({ error: "Ongeldig account." }, { status: 400 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "E-mailadres is al in gebruik." }, { status: 409 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/community-tools/v1/organizations/[organizationId]/users/[userId]">,
) {
  const { organizationId, userId } = await params;
  const access = await context(request, organizationId);
  if ("error" in access) return Response.json({ error: "Geen toegang." }, { status: access.error });
  const [kind, id] = splitId(userId);
  if (kind === "participant") {
    const found = await prisma.participant.findFirst({ where: { id, organizationId: access.organization.id } });
    if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
    await prisma.participant.delete({ where: { id } });
  } else if (kind === "coordinator") {
    const found = await prisma.coordinator.findFirst({ where: { id, organizationId: access.organization.id } });
    if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
    await prisma.vacancy.updateMany({ where: { coordinatorId: id }, data: { coordinatorId: null } });
    await prisma.coordinator.delete({ where: { id } });
  } else if (kind === "central-admin") {
    const found = await prisma.communityToolsAccount.findFirst({ where: { id, organizationId: access.organization.id } });
    if (!found) return Response.json({ error: "Niet gevonden." }, { status: 404 });
    await prisma.communityToolsAccount.delete({ where: { id } });
  } else {
    return Response.json({ error: "De hoofdbeheerder kan niet worden verwijderd." }, { status: 409 });
  }
  return Response.json({ ok: true });
}

function splitId(value: string): [string, string] {
  const separator = value.indexOf(":");
  return separator < 0 ? ["", value] : [value.slice(0, separator), value.slice(separator + 1)];
}
