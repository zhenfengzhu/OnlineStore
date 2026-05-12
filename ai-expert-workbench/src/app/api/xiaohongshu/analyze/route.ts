import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runXiaohongshuAnalysis } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { toXiaohongshuExtractionView } from "@/lib/views";

export const runtime = "nodejs";

function getAnalysisErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

  if (status === 401 || status === 403 || /\b(401|403)\b/.test(message)) {
    return "模型接口拒绝了这次拆解请求，请检查模型设置里的 API Key、账号权限或余额。当前使用的供应商如果是 DeepSeek，通常是 Key 无效、额度不足或账号没有该模型权限。";
  }

  if (/rate limit|429|quota|insufficient/i.test(message)) {
    return "模型接口额度或频率受限，请稍后重试，或检查模型供应商余额。";
  }

  return message || "爆文拆解失败，请重试。";
}

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

  try {
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
  } catch (error) {
    return NextResponse.json(
      { error: getAnalysisErrorMessage(error) },
      { status: 502 }
    );
  }
}
