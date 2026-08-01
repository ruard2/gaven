import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { send } from "@/lib/email";
import { verifyCommunityToolsManagementRequest } from "@/lib/communityToolsManagement";

export async function POST(request: Request, { params }: RouteContext<"/api/community-tools/v1/organizations/[organizationId]/users/[userId]/resend">) {
  if (!verifyCommunityToolsManagementRequest(request)) return Response.json({ error: "Geen toegang." }, { status: 401 });
  const { organizationId, userId } = await params;
  const organization = await prisma.organization.findUnique({ where: { communityToolsOrganizationId: organizationId } });
  if (!organization || !userId.startsWith("coordinator:")) return Response.json({ error: "Niet gevonden." }, { status: 404 });
  const id = userId.slice("coordinator:".length);
  const coordinator = await prisma.coordinator.findFirst({ where: { id, organizationId: organization.id } });
  if (!coordinator) return Response.json({ error: "Niet gevonden." }, { status: 404 });
  const inviteToken = crypto.randomBytes(32).toString("hex");
  await prisma.coordinator.update({ where: { id }, data: { inviteToken, inviteExpiresAt: new Date(Date.now() + 30 * 86400000), status: "invited" } });
  const url = `${process.env.APP_URL || "https://www.gavenmatch.nl"}/coordinator/activeer/${inviteToken}`;
  await send(coordinator.email, `Nieuwe uitnodiging — ${organization.name}`, `<p><a href="${url}">Activeer je account</a></p>`, organization.name);
  return Response.json({ ok: true });
}
