import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  referral: z.string().max(500).optional(),
});

function generateToken(email: string): string {
  return crypto
    .createHmac("sha256", process.env.APPROVAL_SECRET!)
    .update(email)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, referral } = parsed.data;
  const token = generateToken(email);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const adminEmail = process.env.BATCHFLIX_ADMIN_EMAIL;

  const approveUrl = `${appUrl}/api/approve-access?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&token=${token}`;
  const denyUrl = `${appUrl}/api/deny-access?email=${encodeURIComponent(email)}&token=${token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "noreply@batch-apps.com",
    to: adminEmail!,
    subject: `BatchFlix Access Request - ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">New Access Request</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            <td style="padding:8px 0;color:#71717a;width:100px">Name</td>
            <td style="padding:8px 0;font-weight:500">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#71717a">Email</td>
            <td style="padding:8px 0">${email}</td>
          </tr>
          ${referral ? `
          <tr>
            <td style="padding:8px 0;color:#71717a;vertical-align:top">Referral</td>
            <td style="padding:8px 0">${referral}</td>
          </tr>` : ""}
        </table>
        <div style="display:flex;gap:12px">
          <a href="${approveUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">
            Approve Access
          </a>
          <a href="${denyUrl}" style="display:inline-block;padding:10px 20px;background:#1f1f1f;color:#fafafa;text-decoration:none;border-radius:6px;font-weight:500">
            Deny
          </a>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
