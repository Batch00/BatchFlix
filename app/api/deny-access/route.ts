import { NextRequest, NextResponse } from "next/server";
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
  const token = searchParams.get("token") ?? "";

  if (!email || !token || !verifyToken(email, token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#fafafa">
      <h2>Access request denied</h2>
      <p>The access request from <strong>${email}</strong> has been denied.</p>
    </body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
