import nodemailer from "nodemailer";

async function sendViaBrevo(to: string, subject: string, html: string, fromName: string, replyTo?: string) {
  const apiKey = process.env.BREVO_API_KEY!;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: from },
      replyTo: replyTo ? { email: replyTo } : undefined,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, fromName: string, replyTo?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_FROM}>`,
    replyTo: replyTo || undefined,
    to,
    subject,
    html,
  });
}

export async function send(to: string, subject: string, html: string, fromName: string, replyTo?: string) {
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, html, fromName, replyTo);
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    await sendViaSmtp(to, subject, html, fromName, replyTo);
  } else {
    console.log(`=== EMAIL (no provider) → ${to} | ${subject} ===`);
  }
}

function card(content: string) {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;line-height:1.6;">${content}</div>`;
}

function footer(orgName: string) {
  return `<p style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:32px;">Gavenroute &bull; ${orgName}</p>`;
}

const RESPONSE_LABELS: Record<string, string> = {
  meedoen: "Wil meedoen",
  meekijken: "Wil meekijken",
  contact: "Wil contact",
  vraag: "Heeft een vraag",
};

export async function sendApplicationEmail(data: {
  contactPersonEmail: string;
  contactPersonName: string;
  vacancyTitle: string;
  organizationName: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string | null;
  responseType: string;
  message?: string | null;
  firstStepChoice?: string | null;
  availabilityNote?: string | null;
  matchedQualities: string[];
}) {
  const responseLabel = RESPONSE_LABELS[data.responseType] || data.responseType;

  // ── 1. Bevestiging aan vrijwilliger ───────────────────────────────
  const volunteerHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
      <h2 style="color:#1d4ed8;margin-bottom:4px;">Je aanmelding is ontvangen!</h2>
      <p style="color:#6b7280;margin-top:0;">${data.organizationName}</p>

      <p>Hoi ${data.participantName},</p>

      <p>Je hebt je aangemeld voor <strong>${data.vacancyTitle}</strong>.<br/>
      Een bevestigingsmail is ook gestuurd naar <strong>${data.contactPersonEmail}</strong>.</p>

      ${card(`
        <b>Coördinator:</b> ${data.contactPersonName}<br/>
        <b>E-mail:</b> <a href="mailto:${data.contactPersonEmail}" style="color:#2563eb;">${data.contactPersonEmail}</a>
        ${data.firstStepChoice ? `<br/><br/><b>Jouw eerste stap:</b> ${data.firstStepChoice}` : ""}
      `)}

      <p>Hij/zij zal binnenkort contact met je opnemen.<br/>
      <strong>Gebeurt dit niet? Spreek ${data.contactPersonName} dan gerust zelf aan!</strong></p>

      ${footer(data.organizationName)}
    </div>
  `;

  await send(
    data.participantEmail,
    `Aanmelding ontvangen: ${data.vacancyTitle}`,
    volunteerHtml,
    data.organizationName,
  );

  // ── 2. Notificatie aan coördinator ────────────────────────────────
  const coordHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;">
      <h2 style="color:#1d4ed8;margin-bottom:4px;">Nieuwe aanmelding voor ${data.vacancyTitle}</h2>
      <p style="color:#6b7280;margin-top:0;">${data.organizationName}</p>

      <p>Hoi ${data.contactPersonName},</p>

      <p>Er heeft zich iemand aangemeld via Gavenroute voor de taak <strong>${data.vacancyTitle}</strong>.
      Neem zo snel mogelijk contact op!</p>

      ${card(`
        <b>Naam:</b> ${data.participantName}<br/>
        <b>E-mail:</b> <a href="mailto:${data.participantEmail}" style="color:#2563eb;">${data.participantEmail}</a><br/>
        ${data.participantPhone ? `<b>Telefoon:</b> ${data.participantPhone}<br/>` : ""}
        <b>Reactie:</b> ${responseLabel}<br/>
        ${data.firstStepChoice ? `<b>Gewenste eerste stap:</b> ${data.firstStepChoice}<br/>` : ""}
        ${data.availabilityNote ? `<b>Beschikbaarheid:</b> ${data.availabilityNote}<br/>` : ""}
        ${data.message ? `<b>Opmerking:</b> ${data.message}<br/>` : ""}
      `)}

      ${data.matchedQualities.length > 0 ? `<p style="font-size:13px;color:#6b7280;">Match op basis van: ${data.matchedQualities.join(", ")}</p>` : ""}

      ${footer(data.organizationName)}
    </div>
  `;

  await send(
    data.contactPersonEmail,
    `Nieuwe aanmelding: ${data.participantName} voor ${data.vacancyTitle}`,
    coordHtml,
    data.organizationName,
  );

}
