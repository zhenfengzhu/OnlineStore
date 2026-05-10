import { NextResponse } from "next/server";
import { getAccountProfile, saveAccountProfile } from "@/lib/account-profile";
import type { AccountProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ profile: getAccountProfile() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AccountProfile>;
    const profile = saveAccountProfile({
      accountName: body.accountName ?? "",
      positioning: body.positioning ?? "",
      targetAudience: body.targetAudience ?? "",
      toneStyle: body.toneStyle ?? "",
      preferredPhrases: body.preferredPhrases ?? "",
      forbiddenPhrases: body.forbiddenPhrases ?? "",
      brandBoundaries: body.brandBoundaries ?? ""
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "账号设置保存失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
