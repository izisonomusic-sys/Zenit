import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const destination = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  let error: { message: string } | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else {
    error = { message: "Missing confirmation token" };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (!error) return NextResponse.redirect(new URL(destination, base));
  const failure = new URL("/login", base);
  failure.searchParams.set("message", "confirmation_failed");
  return NextResponse.redirect(failure);
}
