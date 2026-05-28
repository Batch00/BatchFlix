import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";

function verifyToken(email: string, token: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", process.env.APPROVAL_SECRET!)
      .update(email)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!email || !token || !verifyToken(email, token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/setup-password` }
  );

  if (inviteError) {
    console.error("Invite error:", inviteError);
    return new NextResponse(`Failed to invite user: ${inviteError.message}`, {
      status: 500,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "noreply@batch-apps.com",
    to: email,
    subject: "You've been invited to BatchFlix",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">Welcome to BatchFlix${name ? `, ${name}` : ""}</h2>
        <p style="color:#71717a;margin:0 0 24px">
          Check your inbox for an invitation email with a link to set your password.
        </p>
        <p style="color:#71717a;font-size:14px">
          BatchFlix is your personal movie and TV tracker.
        </p>
      </div>
    `,
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#fafafa">
      <h2>Access approved</h2>
      <p>Invite sent to <strong>${email}</strong>.</p>
    </body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
