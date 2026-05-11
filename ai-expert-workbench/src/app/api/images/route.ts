import { NextResponse } from "next/server";
import { generateImage, getModelConfigError, hasModelConfig } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  try {
    const { prompt, size } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const b64Data = await generateImage({ prompt, size });
    const dataUrl = `data:image/png;base64,${b64Data}`;

    return NextResponse.json({ url: dataUrl });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
