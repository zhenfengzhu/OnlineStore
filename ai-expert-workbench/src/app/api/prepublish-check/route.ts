import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runPrePublishCheck } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as {
    assetId?: string;
  };

  if (!body.assetId) {
    return NextResponse.json({ error: "缺少要检查的内容 ID。" }, { status: 400 });
  }

  const asset = await prisma.contentAsset.findUnique({ where: { id: body.assetId } });
  if (!asset) {
    return NextResponse.json({ error: "未找到要检查的内容。" }, { status: 404 });
  }

  const output = await runPrePublishCheck({
    title: asset.title,
    content: asset.body,
    assetType: asset.type
  });

  return NextResponse.json({ output });
}
