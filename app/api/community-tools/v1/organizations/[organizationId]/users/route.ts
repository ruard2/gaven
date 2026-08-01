import { prisma } from "@/lib/db";
import { verifyCommunityToolsManagementRequest } from "@/lib/communityToolsManagement";
import crypto from "node:crypto";
import { send } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/community-tools/v1/organizations/[organizationId]/users">,
) {
  if (!verifyCommunityToolsManagementRequest(request)) {
    return Response.json(
      { error: "Ongeldige Community Tools-beheerverbinding." },
      { status: 401 },
    );
  }

  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({
    where: { communityToolsOrganizationId: organizationId },
    include: {
      admin: { select: { id: true, email: true, communityToolsUserId: true } },
      communityToolsAccounts: {
        select: { id: true, communityToolsUserId: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      },
      coordinators: {
        select: { id: true, name: true, email: true, status: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      },
      participants: {
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      },
    },
  });
  if (!organization) {
    return Response.json(
      { error: "Organisatie is nog niet aan GavenMatch gekoppeld." },
      { status: 404 },
    );
  }

  const users: Array<{
    id: string;
    communityToolsUserId: string | null;
    name: string;
    email: string;
    role: string;
    status: string;
    kind: string;
  }> = organization.communityToolsAccounts.map((account) => ({
    id: `central-admin:${account.id}`,
    communityToolsUserId: account.communityToolsUserId,
    name: account.name || account.email,
    email: account.email,
    role: "organization_admin",
    status: "active",
    kind: "admin",
  }));
  if (
    !organization.communityToolsAccounts.some(
      (account) => account.email.toLowerCase() === organization.admin.email.toLowerCase(),
    )
  ) {
    users.unshift({
      id: `local-admin:${organization.admin.id}`,
      communityToolsUserId: organization.admin.communityToolsUserId,
      name: organization.admin.email,
      email: organization.admin.email,
      role: "organization_admin",
      status: "active",
      kind: "admin",
    });
  }
  users.push(
    ...organization.coordinators.map((coordinator) => ({
      id: `coordinator:${coordinator.id}`,
      communityToolsUserId: null,
      name: coordinator.name || coordinator.email,
      email: coordinator.email,
      role: "coordinator",
      status: coordinator.status === "active" ? "active" : "pending",
      kind: "admin",
    })),
  );
  users.push(
    ...organization.participants.map((participant) => ({
      id: `participant:${participant.id}`,
      communityToolsUserId: null,
      name: participant.name || participant.email,
      email: participant.email,
      role: "participant",
      status: "active",
      kind: "user",
    })),
  );

  return Response.json({
    version: "1",
    product: "gifts_matching",
    organizationId,
    users,
  });
}

export async function POST(request: Request, { params }: RouteContext<"/api/community-tools/v1/organizations/[organizationId]/users">) {
  if (!verifyCommunityToolsManagementRequest(request)) return Response.json({ error: "Geen toegang." }, { status: 401 });
  const { organizationId } = await params;
  const organization = await prisma.organization.findUnique({ where: { communityToolsOrganizationId: organizationId } });
  if (!organization) return Response.json({ error: "Organisatie niet gekoppeld." }, { status: 404 });
  const body = await request.json() as { name?: string; email?: string; role?: string };
  const name = body.name?.trim(); const email = body.email?.trim().toLowerCase();
  if (!name || !email) return Response.json({ error: "Naam en e-mail zijn verplicht." }, { status: 400 });
  try {
    if (body.role === "participant") {
      const participant = await prisma.participant.create({ data: { organizationId: organization.id, name, email } });
      return Response.json({ id: `participant:${participant.id}` }, { status: 201 });
    }
    if (body.role !== "coordinator") return Response.json({ error: "Ongeldige rol." }, { status: 400 });
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const coordinator = await prisma.coordinator.create({ data: { organizationId: organization.id, name, email, inviteToken, inviteExpiresAt: new Date(Date.now() + 30 * 86400000), status: "invited" } });
    const url = `${process.env.APP_URL || "https://www.gavenmatch.nl"}/coordinator/activeer/${inviteToken}`;
    await send(email, `Uitnodiging coördinator — ${organization.name}`, `<p>Je bent uitgenodigd als coördinator voor ${organization.name}.</p><p><a href="${url}">Account activeren</a></p>`, organization.name);
    return Response.json({ id: `coordinator:${coordinator.id}` }, { status: 201 });
  } catch { return Response.json({ error: "Account bestaat al of e-mail kon niet worden verstuurd." }, { status: 409 }); }
}
