import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromCookies();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });

  const config = {
    SMTP_HOST: process.env.SMTP_HOST || "(not set)",
    SMTP_PORT: process.env.SMTP_PORT || "(not set)",
    SMTP_USER: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 4) + "***" : "(not set)",
    SMTP_PASS: process.env.SMTP_PASS ? "***set***" : "(not set)",
    SMTP_FROM: process.env.SMTP_FROM || "(not set)",
  };

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ ok: false, error: "SMTP_USER or SMTP_PASS not set", config });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"Gavenroute Test" <${process.env.SMTP_FROM}>`,
      to,
      subject: "Gavenroute SMTP test",
      html: "<p>SMTP verbinding werkt!</p>",
    });
    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; command?: string; response?: string };
    return NextResponse.json({
      ok: false,
      config,
      error: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
    });
  }
}
