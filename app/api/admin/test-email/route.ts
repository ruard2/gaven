import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });

  const config = {
    provider: process.env.BREVO_API_KEY ? "brevo" : process.env.SMTP_USER ? "smtp" : "none",
    BREVO_API_KEY: process.env.BREVO_API_KEY ? "***set***" : "(not set)",
    SMTP_HOST: process.env.SMTP_HOST || "(not set)",
    SMTP_USER: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 4) + "***" : "(not set)",
    SMTP_FROM: process.env.SMTP_FROM || "(not set)",
  };

  if (process.env.BREVO_API_KEY) {
    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Gavenmatch Test", email: from },
          to: [{ email: to }],
          subject: "Gavenmatch e-mail test",
          htmlContent: "<p>Brevo verbinding werkt vanuit Railway!</p>",
        }),
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`Brevo ${res.status}: ${body}`);
      return NextResponse.json({ ok: true, config });
    } catch (e: unknown) {
      return NextResponse.json({ ok: false, config, error: (e as Error).message });
    }
  }

  return NextResponse.json({ ok: false, config, error: "BREVO_API_KEY not set — add it in Railway variables" });
}
