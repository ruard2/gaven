import nodemailer from "nodemailer";
import * as fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, "../.env"), "utf8").split("\n")
    .filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,"")]; })
);

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT),
  secure: false,
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

console.log(`Verbinding testen met ${env.SMTP_HOST}:${env.SMTP_PORT}...`);
await transporter.verify();
console.log("SMTP verbinding OK");

console.log("E-mail versturen naar dsstolper@gmail.com...");
const info = await transporter.sendMail({
  from: `"Gavenroute Test" <${env.SMTP_FROM}>`,
  to: "ruard.stolper@gmail.com",
  subject: "Test e-mail Gavenroute",
  html: `<div style="font-family:sans-serif;max-width:480px;">
    <h2 style="color:#1d4ed8;">Test e-mail ✓</h2>
    <p>Als je dit ziet, werkt SMTP correct vanuit Gavenroute.</p>
    <p style="color:#6b7280;font-size:13px;">Verstuurd via: ${env.SMTP_USER}</p>
  </div>`,
});

console.log("Verstuurd! Message ID:", info.messageId);
