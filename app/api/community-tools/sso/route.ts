import { NextRequest, NextResponse } from "next/server";
import { signAdminToken } from "@/lib/auth";
import { exchangeCommunityToolsTicket } from "@/lib/communityTools";
import { prisma } from "@/lib/db";
import { generatePublicCode, generateSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ct_ticket") ?? "";

  try {
    const context = await exchangeCommunityToolsTicket(ticket);
    const admin = await prisma.$transaction(async (tx) => {
      const centrallyLinkedOrganization = await tx.organization.findUnique({
        where: { communityToolsOrganizationId: context.organization.id },
        include: { admin: true },
      });
      if (centrallyLinkedOrganization) {
        await tx.communityToolsAccount.upsert({
          where: {
            communityToolsUserId_communityToolsOrganizationId: {
              communityToolsUserId: context.user.id,
              communityToolsOrganizationId: context.organization.id,
            },
          },
          create: {
            communityToolsUserId: context.user.id,
            communityToolsOrganizationId: context.organization.id,
            email: context.user.email,
            name: context.user.name,
            adminId: centrallyLinkedOrganization.adminId,
            organizationId: centrallyLinkedOrganization.id,
          },
          update: {
            email: context.user.email,
            name: context.user.name,
            adminId: centrallyLinkedOrganization.adminId,
            organizationId: centrallyLinkedOrganization.id,
          },
        });
        return centrallyLinkedOrganization.admin;
      }

      const byCentralId = await tx.admin.findUnique({
        where: { communityToolsUserId: context.user.id },
      });
      const byEmail = byCentralId
        ? null
        : await tx.admin.findUnique({ where: { email: context.user.email } });
      const localAdmin = byCentralId
        ? await tx.admin.update({
            where: { id: byCentralId.id },
            data: { email: context.user.email },
          })
        : byEmail
          ? await tx.admin.update({
              where: { id: byEmail.id },
              data: { communityToolsUserId: context.user.id },
            })
          : await tx.admin.create({
              data: {
                email: context.user.email,
                communityToolsUserId: context.user.id,
                passwordHash: "",
              },
            });

      const existingOrganization = await tx.organization.findFirst({
        where: {
          adminId: localAdmin.id,
          OR: [
            { name: context.organization.name },
            { contactEmail: context.user.email },
          ],
        },
      });
      const localOrganization = existingOrganization
        ? await tx.organization.update({
            where: { id: existingOrganization.id },
            data: { communityToolsOrganizationId: context.organization.id },
          })
        : await tx.organization.create({
            data: {
              name: context.organization.name,
              slug: await availableSlug(tx, context.organization.name),
              publicCode: await availablePublicCode(tx),
              organizationType: "church",
              contactEmail: context.user.email,
              adminId: localAdmin.id,
              communityToolsOrganizationId: context.organization.id,
            },
          });
      await tx.communityToolsAccount.upsert({
        where: {
          communityToolsUserId_communityToolsOrganizationId: {
            communityToolsUserId: context.user.id,
            communityToolsOrganizationId: context.organization.id,
          },
        },
        create: {
          communityToolsUserId: context.user.id,
          communityToolsOrganizationId: context.organization.id,
          email: context.user.email,
          name: context.user.name,
          adminId: localAdmin.id,
          organizationId: localOrganization.id,
        },
        update: {
          email: context.user.email,
          name: context.user.name,
          adminId: localAdmin.id,
          organizationId: localOrganization.id,
        },
      });
      return localAdmin;
    });

    const response = NextResponse.redirect(
      new URL("/admin/dashboard", request.url),
    );
    response.cookies.set("admin_token", signAdminToken(admin.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/admin/login?error=community-tools", request.url),
    );
  }
}

type Transaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

async function availableSlug(tx: Transaction, name: string) {
  const base = generateSlug(name) || "organisatie";
  let slug = base;
  let suffix = 2;
  while (await tx.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function availablePublicCode(tx: Transaction) {
  let code = generatePublicCode();
  while (await tx.organization.findUnique({ where: { publicCode: code } })) {
    code = generatePublicCode();
  }
  return code;
}
