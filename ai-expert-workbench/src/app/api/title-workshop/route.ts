import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runTitleWorkshop } from "@/lib/openai";
import type { TitleStyle } from "@/lib/types";

export const runtime = "nodejs";

const allStyles: TitleStyle[] = ["emotional", "list", "warning", "contrast", "experience"];

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as {
    userInput?: string;
    preferredStyles?: TitleStyle[];
  };

  const userInput = body.userInput?.trim();
  if (!userInput) {
    return NextResponse.json({ error: "请输入标题工坊的创作背景。" }, { status: 400 });
  }

  const preferredStyles = (body.preferredStyles ?? []).filter((style) =>
    allStyles.includes(style)
  );

  const output = await runTitleWorkshop({
    userInput,
    preferredStyles: preferredStyles.length > 0 ? preferredStyles : allStyles
  });

  return NextResponse.json({ output });
}
