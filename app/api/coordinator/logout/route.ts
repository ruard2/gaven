import { NextResponse } from "next/server";
import { COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
