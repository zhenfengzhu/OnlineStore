import { NextResponse } from "next/server";
import { generateImage, hasModelConfig, getModelConfigError } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "请输入画面描述。" }, { status: 400 });
    }

    const url = await generateImage(prompt);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片生成失败" },
      { status: 500 }
    );
  }
}
