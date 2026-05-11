import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runXiaohongshuAnalysis } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { toXiaohongshuExtractionView } from "@/lib/views";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as { extractionId?: string };
  if (!body.extractionId) {
    return NextResponse.json({ error: "缺少要拆解的图文记录 ID。" }, { status: 400 });
  }

  const extraction = await prisma.xiaohongshuExtraction.findUnique({ where: { id: body.extractionId } });
  if (!extraction) {
    return NextResponse.json({ error: "未找到要拆解的图文记录。" }, { status: 404 });
  }

  const images = (() => {
    try {
      const parsed = JSON.parse(extraction.imagesJson) as unknown;
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
      return [];
    }
  })();

  const analysis = await runXiaohongshuAnalysis({
    title: extraction.title,
    text: extraction.text,
    imageCount: images.length,
    tags: extraction.tags
  });

  const hasUsefulContent = [
    analysis.summary,
    analysis.titleAnalysis,
    analysis.openingAnalysis,
    analysis.reusableFormula,
    analysis.rewriteBrief.targetAudience,
    analysis.rewriteBrief.contentAngle
  ].some((text) => text.trim().length > 0) || [
    analysis.contentStructure,
    analysis.sellingPoints,
    analysis.emotionTriggers,
    analysis.interactionHooks,
    analysis.visualNotes,
    analysis.riskNotes,
    analysis.rewriteBrief.replaceableVariables,
    analysis.rewriteBrief.forbiddenRisks
  ].some((items) => items.length > 0);

  if (!hasUsefulContent) {
    return NextResponse.json({ error: "模型返回了空拆解结果，请重新点击 AI拆解。" }, { status: 502 });
  }

  const updated = await prisma.xiaohongshuExtraction.update({
    where: { id: extraction.id },
    data: {
      analysisJson: JSON.stringify(analysis)
    }
  });

  return NextResponse.json({
    extraction: toXiaohongshuExtractionView(updated)
  });
}
