import type { CalendarItem, ContentAsset, XiaohongshuExtraction } from "@prisma/client";
import type {
  CalendarItemView,
  ContentAssetMeta,
  ContentAssetView,
  InteractionScript,
  XiaohongshuAnalysisOutput,
  XiaohongshuExtractionView
} from "@/lib/types";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item)).filter(Boolean)
    : [];
}

function normalizeInteractionScripts(value: unknown): InteractionScript[] {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const raw = item as Partial<InteractionScript>;
          return {
            scenario: cleanText(raw.scenario),
            userQuery: cleanText(raw.userQuery),
            aiReply: cleanText(raw.aiReply)
          };
        })
        .filter((item) => item.scenario || item.userQuery || item.aiReply)
    : [];
}

function normalizeAssetMeta(value: unknown): ContentAssetMeta {
  if (!value || typeof value !== "object") return {};
  const raw = value as Partial<ContentAssetMeta>;

  return {
    visualSuggestion: cleanText(raw.visualSuggestion) || undefined,
    shootingSuggestion: cleanText(raw.shootingSuggestion) || undefined,
    firstCommentVariants: cleanStringArray(raw.firstCommentVariants),
    interactionScripts: normalizeInteractionScripts(raw.interactionScripts),
    targetAudience: cleanText(raw.targetAudience) || undefined,
    riskTip: cleanText(raw.riskTip) || undefined
  };
}

function parseAssetMetaJson(value: string | null) {
  if (!value) return {};

  try {
    return normalizeAssetMeta(JSON.parse(value));
  } catch {
    return {};
  }
}

function readSingleLine(body: string, marker: string) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return body.match(new RegExp(`${escaped}[ \\t]*([^\\r\\n]*)`, "m"))?.[1]?.trim() ?? "";
}

function parseLegacyInteractionScripts(body: string) {
  const section = body.split("🔥 互动问答脚本：")[1]?.split("👥 适合人群：")[0] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const match = line.match(/^- \[(.*?)\]\s*用户：(.*?)\s*->\s*AI回复：(.*)$/);
      return {
        scenario: match?.[1]?.trim() ?? "",
        userQuery: match?.[2]?.trim() ?? line.replace(/^- /, ""),
        aiReply: match?.[3]?.trim() ?? ""
      };
    })
    .filter((item) => item.scenario || item.userQuery || item.aiReply);
}

function splitLegacyNoteBody(body: string, initialMeta: ContentAssetMeta) {
  const hasLegacyMeta = body.includes("📸 封面视觉建议：") || body.includes("📝 封面文案：") || body.includes("🏷️ 标签：");
  if (!hasLegacyMeta) {
    return { body, meta: initialMeta };
  }

  const withoutTitle = body.replace(/^# .*(?:\r?\n)+/, "").trim();
  const afterCoverText = withoutTitle.match(/📝 封面文案：.*(?:\r?\n)+([\s\S]*)/)?.[1] ?? withoutTitle;
  const cleanBody = afterCoverText.split("🏷️ 标签：")[0].trim();
  const firstComments = [
    readSingleLine(body, "💬 首评策略（Variant 1 - 补充信息）："),
    readSingleLine(body, "💬 首评策略（Variant 2 - 互动钩子）："),
    readSingleLine(body, "💬 首评策略（Variant 3 - 真实感）：")
  ].filter(Boolean);

  return {
    body: cleanBody,
    meta: {
      visualSuggestion: (initialMeta.visualSuggestion ?? readSingleLine(body, "📸 封面视觉建议：")) || undefined,
      shootingSuggestion: (initialMeta.shootingSuggestion ?? readSingleLine(body, "🎬 拍摄建议：")) || undefined,
      firstCommentVariants: initialMeta.firstCommentVariants?.length ? initialMeta.firstCommentVariants : firstComments,
      interactionScripts: initialMeta.interactionScripts?.length ? initialMeta.interactionScripts : parseLegacyInteractionScripts(body),
      targetAudience: (initialMeta.targetAudience ?? readSingleLine(body, "👥 适合人群：")) || undefined,
      riskTip: (initialMeta.riskTip ?? readSingleLine(body, "⚠️ 风险提醒：")) || undefined
    }
  };
}

export function toAssetView(asset: ContentAsset): ContentAssetView {
  const parsedMeta = parseAssetMetaJson(asset.contentMetaJson);
  const normalized = asset.type === "note"
    ? splitLegacyNoteBody(asset.body, parsedMeta)
    : { body: asset.body, meta: parsedMeta };

  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    body: normalized.body,
    tags: asset.tags,
    source: asset.source,
    parentId: asset.parentId,
    variantType: asset.variantType,
    status: asset.status,
    isFavorite: asset.isFavorite,
    coverImage: asset.coverImage,
    coverText: asset.coverText,
    meta: normalized.meta,
    createdAt: asset.createdAt.toISOString()
  };
}

export function toCalendarItemView(item: CalendarItem): CalendarItemView {
  return {
    id: item.id,
    day: item.day,
    topic: item.topic,
    format: item.format,
    angle: item.angle,
    assetTitle: item.assetTitle,
    goal: item.goal,
    status: item.status,
    createdAt: item.createdAt.toISOString()
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeAnalysis(value: unknown): XiaohongshuAnalysisOutput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<XiaohongshuAnalysisOutput>;
  const rawBrief = raw.rewriteBrief && typeof raw.rewriteBrief === "object"
    ? raw.rewriteBrief as Partial<XiaohongshuAnalysisOutput["rewriteBrief"]>
    : {};

  const normalized = {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    hookType: typeof raw.hookType === "string" ? raw.hookType : "未识别",
    titleAnalysis: typeof raw.titleAnalysis === "string" ? raw.titleAnalysis : "",
    openingAnalysis: typeof raw.openingAnalysis === "string" ? raw.openingAnalysis : "",
    contentStructure: Array.isArray(raw.contentStructure)
      ? raw.contentStructure
          .map((item) => ({
            section: typeof item?.section === "string" ? item.section.trim() : "",
            purpose: typeof item?.purpose === "string" ? item.purpose.trim() : "",
            originalSignal: typeof item?.originalSignal === "string" ? item.originalSignal.trim() : "",
            reusableMove: typeof item?.reusableMove === "string" ? item.reusableMove.trim() : ""
          }))
          .filter((item) => item.section || item.purpose || item.originalSignal || item.reusableMove)
      : [],
    sellingPoints: asStringArray(raw.sellingPoints),
    emotionTriggers: asStringArray(raw.emotionTriggers),
    interactionHooks: asStringArray(raw.interactionHooks),
    visualNotes: asStringArray(raw.visualNotes),
    riskNotes: asStringArray(raw.riskNotes),
    reusableFormula: typeof raw.reusableFormula === "string" ? raw.reusableFormula : "",
    rewriteBrief: {
      targetAudience: typeof rawBrief.targetAudience === "string" ? rawBrief.targetAudience : "",
      contentAngle: typeof rawBrief.contentAngle === "string" ? rawBrief.contentAngle : "",
      emotionHook: typeof rawBrief.emotionHook === "string" ? rawBrief.emotionHook : "",
      productFit: typeof rawBrief.productFit === "string" ? rawBrief.productFit : "",
      replaceableVariables: asStringArray(rawBrief.replaceableVariables),
      forbiddenRisks: asStringArray(rawBrief.forbiddenRisks)
    }
  };

  const hasUsefulContent = [
    normalized.summary,
    normalized.titleAnalysis,
    normalized.openingAnalysis,
    normalized.reusableFormula,
    normalized.rewriteBrief.targetAudience,
    normalized.rewriteBrief.contentAngle
  ].some((text) => text.trim().length > 0) || [
    normalized.contentStructure,
    normalized.sellingPoints,
    normalized.emotionTriggers,
    normalized.interactionHooks,
    normalized.visualNotes,
    normalized.riskNotes,
    normalized.rewriteBrief.replaceableVariables,
    normalized.rewriteBrief.forbiddenRisks
  ].some((items) => items.length > 0);

  return hasUsefulContent ? normalized : null;
}

export function toXiaohongshuExtractionView(item: XiaohongshuExtraction): XiaohongshuExtractionView {
  let images: string[] = [];
  let topics: string[] = [];
  let analysis: XiaohongshuAnalysisOutput | null = null;
  try {
    const parsed = JSON.parse(item.imagesJson) as unknown;
    images = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    images = [];
  }
  try {
    const parsed = item.topicsJson ? JSON.parse(item.topicsJson) as unknown : [];
    topics = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    topics = [];
  }

  const textTopicPattern = /#\s*([^#[\]\s][^#\[]*?)\s*(?:\[话题\])?#/g;
  let text = item.text.replace(textTopicPattern, (_match, topic: string) => {
    const cleanTopic = String(topic).trim();
    if (cleanTopic) topics.push(cleanTopic);
    return " ";
  }).replace(/\s{2,}/g, " ").trim();
  topics = Array.from(new Set(topics));

  try {
    analysis = item.analysisJson ? normalizeAnalysis(JSON.parse(item.analysisJson)) : null;
  } catch {
    analysis = null;
  }

  return {
    id: item.id,
    title: item.title,
    text,
    topics,
    images,
    analysis,
    tags: item.tags,
    isFavorite: item.isFavorite,
    sourceUrl: item.sourceUrl,
    finalUrl: item.finalUrl,
    createdAt: item.createdAt.toISOString()
  };
}
