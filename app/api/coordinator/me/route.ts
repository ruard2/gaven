import { NextResponse } from "next/server";
import { requireCoordinator } from "@/lib/coordinatorAuth";

export async function GET() {
  const coord = await requireCoordinator();
  if (!coord) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: coord.id,
    name: coord.name,
    email: coord.email,
    status: coord.status,
    organization: { id: coord.organization.id, name: coord.organization.name, slug: coord.organization.slug, primaryColor: coord.organization.primaryColor },
  });
}
