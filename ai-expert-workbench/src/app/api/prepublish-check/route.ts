import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runPrePublishCheck } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseMeta(value: string | null) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).join("；")
    : "";
}

function buildCheckContent(asset: NonNullable<Awaited<ReturnType<typeof prisma.contentAsset.findUnique>>>) {
  const meta = parseMeta(asset.contentMetaJson);
  return [
    "正文：",
    asset.body,
    "",
    `封面文案：${asset.coverText ?? ""}`,
    `标签：${asset.tags ?? ""}`,
    `封面视觉建议：${typeof meta.visualSuggestion === "string" ? meta.visualSuggestion : ""}`,
    `拍摄建议：${typeof meta.shootingSuggestion === "string" ? meta.shootingSuggestion : ""}`,
    `真实场景：${typeof meta.evidenceScene === "string" ? meta.evidenceScene : ""}`,
    `具体细节：${typeof meta.concreteDetail === "string" ? meta.concreteDetail : ""}`,
    `轻微缺点：${typeof meta.mildDrawback === "string" ? meta.mildDrawback : ""}`,
    `适用边界：${typeof meta.fitBoundary === "string" ? meta.fitBoundary : ""}`,
    `互动问题：${typeof meta.interactionQuestion === "string" ? meta.interactionQuestion : ""}`,
    `首评策略：${formatStringArray(meta.firstCommentVariants)}`
  ].join("\n");
}

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
    content: buildCheckContent(asset),
    assetType: asset.type
  });

  return NextResponse.json({ output });
}
