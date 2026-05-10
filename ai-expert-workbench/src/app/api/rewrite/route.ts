import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runRewrite } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { RewriteMode } from "@/lib/types";
import { toAssetView } from "@/lib/views";

export const runtime = "nodejs";

const rewriteModes: RewriteMode[] = [
  "more_conversational",
  "shorter",
  "more_saveworthy",
  "video_voiceover"
];

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as {
    assetId?: string;
    mode?: RewriteMode;
  };

  if (!body.assetId || !body.mode || !rewriteModes.includes(body.mode)) {
    return NextResponse.json({ error: "缺少有效的改写参数。" }, { status: 400 });
  }

  const asset = await prisma.contentAsset.findUnique({ where: { id: body.assetId } });
  if (!asset) {
    return NextResponse.json({ error: "未找到要改写的内容。" }, { status: 404 });
  }

  const rewritten = await runRewrite({
    mode: body.mode,
    title: asset.title,
    content: asset.body,
    assetType: asset.type
  });

  const created = await prisma.contentAsset.create({
    data: {
      type: asset.type,
      title: rewritten.title,
      body: rewritten.body,
      tags: asset.tags,
      source: `rewrite:${body.mode}`,
      parentId: asset.id,
      variantType: body.mode
    }
  });

  return NextResponse.json({
    asset: toAssetView(created),
    summary: rewritten.summary
  });
}
