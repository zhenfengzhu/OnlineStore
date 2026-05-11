import { NextResponse } from "next/server";
import { getContentRules, saveContentRules } from "@/lib/content-rules";
import type { ContentRulesConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ rules: getContentRules() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ContentRulesConfig>;
    const rules = saveContentRules({
      xiaohongshuGraphicRules: body.xiaohongshuGraphicRules
    });

    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "内容规则保存失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
