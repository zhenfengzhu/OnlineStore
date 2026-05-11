"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  PanelsTopLeft,
  Settings,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Video,
  WandSparkles,
  Zap,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Images,
  Layout,
  Link,
  Search,
  Tag,
  X,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MobileSimulator } from "@/components/mobile-simulator";
import { DEFAULT_XIAOHONGSHU_GRAPHIC_RULES, normalizeXiaohongshuGraphicRules } from "@/lib/content-rule-defaults";
import { REWRITE_OPTIONS, TITLE_STYLE_OPTIONS, WORKFLOW_TEMPLATES } from "@/lib/public-config";
import type {
  AccountProfile,
  CalendarItemView,
  ContentAssetView,
  ContentRulesConfig,
  ExpertSession,
  ExpertSkill,
  PrePublishCheckOutput,
  RewriteMode,
  StructuredBrief,
  TitleStyle,
  TitleWorkshopOutput,
  WorkflowOutput,
  WorkflowType,
  XiaohongshuExtractionView
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "generate" | "xiaohongshu" | "calendar" | "assets" | "skills" | "settings";

type NavItem = {
  id: TabKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

type ModelConfigView = {
  activeProviderId: string;
  activeProviderName: string;
  activeModel: string;
  activeBaseURL: string;
  configured: boolean;
  providers: Array<{
    id: string;
    name: string;
    apiKeyEnv: string;
    modelEnv: string;
    defaultModel: string;
    baseURL: string;
    apiStyle: string;
  }>;
};

const workflowOptions: Array<{ id: WorkflowType; label: string; description: string; icon: typeof Sparkles }> = [
  {
    id: "thirty_notes",
    label: "1篇笔记",
    description: "一次生成一篇完整图文，方便逐条打磨",
    icon: FileText
  },
  {
    id: "content_calendar",
    label: "30天日历",
    description: "每日选题、形式、角度和内容目标",
    icon: CalendarDays
  },
  {
    id: "video_scripts",
    label: "短视频脚本",
    description: "钩子、分镜、口播和结尾引导",
    icon: Video
  },
  {
    id: "inspiration_rewrite",
    label: "爆款反推",
    description: "拆解并迁移爆文公式",
    icon: WandSparkles
  }
];

const defaultBrief: StructuredBrief = {
  topic: "",
  productName: "",
  productCategory: "",
  priceRange: "",
  targetAudience: "",
  accountStage: "",
  contentForm: "图文笔记",
  coreSellingPoint: "",
  userPainPoint: "",
  competitorDifference: "",
  proofPoints: "",
  useScene: "",
  emotionOrPainPoint: "",
  mustMention: "",
  toneStyle: "真实分享，像有经验的朋友在推荐",
  forbiddenWords: "",
  additionalNotes: ""
};

const contentGoals = ["拉新曝光", "种草收藏", "评论互动", "引导进店", "提升转化"];
const contentForms = ["图文笔记", "短视频脚本", "内容日历", "测评", "清单", "避坑"];
const calendarStatuses = ["planned", "drafting", "ready", "published"];
const statusLabels: Record<string, string> = {
  planned: "待规划",
  drafting: "撰写中",
  ready: "待发布",
  published: "已发布"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function shouldProxyImageUrl(value: string) {
  try {
    const url = new URL(value);
    return /(^|\.)xhscdn\.com$|(^|\.)xiaohongshu\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function cleanPreviewImageCandidate(value: string) {
  return value
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .split(/(?:;|&quot;|&#34;|&amp;quot;|background-|repeat:|position:|size:)/i)[0]
    .replace(/[)\].,，。;；]+$/g, "")
    .trim();
}

function isLikelyPreviewImageUrl(value: string) {
  if (value.startsWith("data:image/") || value.startsWith("blob:") || value.startsWith("/api/image-proxy")) {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (/sns-video|sns-avatar/i.test(hostname)) return false;
    if (url.pathname === "/" || url.pathname.length < 8) return false;

    return (
      /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url.pathname + url.search) ||
      /imageView2|format=(?:jpg|jpeg|png|webp)|sns-webpic|sns-img|notes_pre_post/i.test(url.href)
    );
  } catch {
    return false;
  }
}

function getPreviewImageUrl(value: string) {
  if (!value || value.startsWith("data:image/") || value.startsWith("blob:") || value.startsWith("/api/image-proxy")) {
    return value;
  }

  return shouldProxyImageUrl(value) ? `/api/image-proxy?url=${encodeURIComponent(value)}` : value;
}

function extractPreviewImages(asset: ContentAssetView) {
  const imageUrls = [asset.coverImage ?? ""];
  const urlMatches = asset.body.match(/(?:https?:\/\/[^\s<>"']+|data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+)/g) ?? [];

  for (const rawUrl of urlMatches) {
    const url = cleanPreviewImageCandidate(rawUrl);
    if (isLikelyPreviewImageUrl(url)) {
      imageUrls.push(url);
    }
  }

  return Array.from(
    new Set(
      imageUrls
        .map(cleanPreviewImageCandidate)
        .filter(isLikelyPreviewImageUrl)
        .map(getPreviewImageUrl)
    )
  );
}

function getExtractionPreviewImages(extraction: XiaohongshuExtractionView) {
  return Array.from(
    new Set(
      extraction.images
        .map(cleanPreviewImageCandidate)
        .filter(isLikelyPreviewImageUrl)
        .map(getPreviewImageUrl)
    )
  );
}

function getXiaohongshuTitleUnits(title: string) {
  return Array.from(title).reduce((total, char) => total + (/^[\x00-\x7F]$/.test(char) ? 0.5 : 1), 0);
}

function getAssetTagList(asset: ContentAssetView) {
  return (asset.tags ?? "")
    .split(/[\s,，#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getPublishBody(asset: ContentAssetView) {
  const tags = getAssetTagList(asset);
  const tagLine = tags.length > 0 ? tags.map((tag) => `#${tag}`).join(" ") : "";
  return [asset.body.trim(), tagLine].filter(Boolean).join("\n\n");
}

function getPublishPack(asset: ContentAssetView) {
  const images = extractPreviewImages(asset);
  return [
    `标题：${asset.title}`,
    "",
    "正文：",
    getPublishBody(asset) || "正文为空，请重新生成这条内容。",
    "",
    "图片：",
    ...(images.length > 0 ? images.map((image, index) => `${index + 1}. ${image}`) : ["未配置图片。"])
  ].join("\n");
}

function getAssetReadiness(asset: ContentAssetView, check?: PrePublishCheckOutput) {
  const meta = asset.meta ?? {};
  const items = [
    { key: "body", label: "正文", done: asset.body.trim().length > 0 },
    { key: "evidence", label: "证据", done: Boolean(meta.evidenceScene && meta.concreteDetail && meta.mildDrawback && meta.fitBoundary && meta.interactionQuestion) },
    { key: "image", label: "配图", done: extractPreviewImages(asset).length > 0 },
    { key: "tags", label: "标签", done: getAssetTagList(asset).length > 0 },
    { key: "check", label: "体检", done: Boolean(check && !check.checks.some((item) => item.status === "fix")) }
  ];
  const doneCount = items.filter((item) => item.done).length;
  const nextMissing = items.find((item) => !item.done);

  return {
    items,
    doneCount,
    total: items.length,
    isReady: doneCount === items.length,
    nextKey: nextMissing?.key ?? "publish",
    nextLabel: nextMissing?.label ?? "发布"
  };
}

function extractionToMarkdown(extraction: XiaohongshuExtractionView) {
  const analysis = extraction.analysis;
  const topics = extraction.topics ?? [];
  const images = extraction.images ?? [];
  return [
    `# ${extraction.title}`,
    "",
    extraction.tags ? `标签：${extraction.tags}` : "",
    topics.length > 0 ? `话题：${topics.map((topic) => `#${topic}`).join(" ")}` : "",
    extraction.tags ? "" : "",
    `来源链接：${extraction.sourceUrl}`,
    extraction.finalUrl !== extraction.sourceUrl ? `解析后链接：${extraction.finalUrl}` : "",
    "",
    "## 原文",
    "",
    extraction.text || "未提取到正文。",
    "",
    "## 图片",
    "",
    ...(images.length > 0
      ? images.map((image, index) => `${index + 1}. ${image}`)
      : ["未提取到图片。"]),
    "",
    analysis ? "## 爆文拆解" : "",
    analysis ? `摘要：${analysis.summary}` : "",
    analysis ? `钩子类型：${analysis.hookType}` : "",
    analysis ? `可迁移公式：${analysis.reusableFormula}` : "",
    analysis ? "" : "",
    analysis ? "### 内容结构" : "",
    ...((analysis?.contentStructure ?? []).map((item, index) =>
      `${index + 1}. ${item.section}｜${item.purpose}｜可复用动作：${item.reusableMove}`
    )),
    analysis ? "" : "",
    analysis ? "### 仿写 Brief" : "",
    analysis ? `目标人群：${analysis.rewriteBrief.targetAudience}` : "",
    analysis ? `内容角度：${analysis.rewriteBrief.contentAngle}` : "",
    analysis ? `情绪钩子：${analysis.rewriteBrief.emotionHook}` : "",
    analysis ? `适合产品：${analysis.rewriteBrief.productFit}` : ""
  ].filter(Boolean).join("\n");
}

function extractionsToMarkdown(extractions: XiaohongshuExtractionView[]) {
  return extractions.map(extractionToMarkdown).join("\n\n---\n\n");
}

function extractionsToCsv(extractions: XiaohongshuExtractionView[]) {
  return [
    ["标题", "标签", "话题", "收藏", "图片数", "来源链接", "创建时间", "正文"].map(csvCell).join(","),
    ...extractions.map((item) =>
      [
        item.title,
        item.tags,
        (item.topics ?? []).join(" "),
        item.isFavorite ? "是" : "否",
        (item.images ?? []).length,
        item.sourceUrl,
        formatDate(item.createdAt),
        item.text
      ].map(csvCell).join(",")
    )
  ].join("\n");
}

function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

function normalizeTitleWorkshopForClient(output: TitleWorkshopOutput | null | undefined): TitleWorkshopOutput | null {
  if (!output) return null;

  const titles = Array.isArray(output.titles)
    ? output.titles.filter((title) => title && typeof title.text === "string" && title.text.trim())
    : [];

  return {
    summary: typeof output.summary === "string" && output.summary.trim()
      ? output.summary
      : "标题建议已生成。",
    titles
  };
}

function assetsToMarkdown(assets: ContentAssetView[]) {
  return assets.map((asset) => asset.body).join("\n\n---\n\n");
}

function assetsToCsv(assets: ContentAssetView[]) {
  return [
    ["类型", "标题", "标签", "来源", "变体", "创建时间", "正文"].map(csvCell).join(","),
    ...assets.map((asset) =>
      [
        asset.type,
        asset.title,
        asset.tags,
        asset.source,
        asset.variantType,
        formatDate(asset.createdAt),
        asset.body
      ]
        .map(csvCell)
        .join(",")
    )
  ].join("\n");
}

function calendarToCsv(items: CalendarItemView[]) {
  return [
    ["天数", "目标", "选题", "形式", "角度", "关联标题", "状态"].map(csvCell).join(","),
    ...items.map((item) =>
      [
        item.day,
        item.goal,
        item.topic,
        item.format,
        item.angle,
        item.assetTitle,
        statusLabels[item.status] ?? item.status
      ]
        .map(csvCell)
        .join(",")
    )
  ].join("\n");
}

const defaultAccountProfile: AccountProfile = {
  accountName: "",
  positioning: "",
  targetAudience: "",
  toneStyle: "",
  preferredPhrases: "",
  forbiddenPhrases: "",
  brandBoundaries: ""
};

function buildPrompt(goal: string, brief: StructuredBrief, profile: AccountProfile) {
  return [
    "账号人设：",
    `账号名称：${profile.accountName || "未填写"}`,
    `账号定位：${profile.positioning || "未填写"}`,
    `账号核心人群：${profile.targetAudience || "未填写"}`,
    `账号固定语气：${profile.toneStyle || "未填写"}`,
    `账号常用表达：${profile.preferredPhrases || "无"}`,
    `账号禁用表达：${profile.forbiddenPhrases || "无"}`,
    `品牌边界：${profile.brandBoundaries || "无"}`,
    "",
    "本次内容需求：",
    `内容目标：${goal}`,
    `主题：${brief.topic || "未填写"}`,
    `产品名称：${brief.productName || "未填写"}`,
    `产品品类：${brief.productCategory || "未填写"}`,
    `价格带：${brief.priceRange || "未填写"}`,
    `目标人群：${brief.targetAudience || "未填写"}`,
    `账号阶段：${brief.accountStage || "未填写"}`,
    `内容形式：${brief.contentForm || "未填写"}`,
    `核心卖点：${brief.coreSellingPoint || "未填写"}`,
    `用户真实痛点：${brief.userPainPoint || "未填写"}`,
    `竞品差异：${brief.competitorDifference || "未填写"}`,
    `证据/素材：${brief.proofPoints || "未填写"}`,
    `使用场景：${brief.useScene || "未填写"}`,
    `情绪/痛点：${brief.emotionOrPainPoint || "未填写"}`,
    `必须出现的信息：${brief.mustMention || "无"}`,
    `语气风格：${brief.toneStyle || "未填写"}`,
    `禁用表达：${brief.forbiddenWords || "无"}`,
    `补充说明：${brief.additionalNotes || "无"}`
  ].join("\n");
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

const DEFAULT_SKILLS: ExpertSkill[] = [
  {
    id: "seo_expert",
    name: "关键词/SEO专家",
    description: "分析当下流量词，埋入 SEO 钩子，提升搜索权重。",
    icon: "Sparkles",
    prompt: "你是一位资深的小红书 SEO 专家。请根据用户提供的内容主题，列出 5-8 个高流量关键词，并建议如何自然地埋入正文前 50 字中。",
    placeholder: "比如：猫咪互动玩具、新手养猫、宠物好物分享...",
    inputLabel: "输入内容主题或核心关键词"
  },
  {
    id: "hook_master",
    name: "心理学/钩子大师",
    description: "专攻第一句话和前 3 秒悬念，让用户不自觉点开并看完。",
    icon: "Gauge",
    prompt: "你是一位精通用户心理学的文案大师。请根据用户的内容，创作 3 个极具吸引力的“第一句话”钩子，分别针对：好奇心、利益诱惑、恐惧提醒。",
    placeholder: "比如：我正在写一篇关于猫咪拆家的笔记...",
    inputLabel: "输入笔记的初稿或核心内容"
  },
  {
    id: "visual_designer",
    name: "视觉/封面美化师",
    description: "提供保姆级的封面排版建议、配色方案和字体选择。",
    icon: "PanelsTopLeft",
    prompt: "你是一位专业的小红书视觉设计师。请根据用户的主题，提供 2 套封面的设计方案，包括：实拍图构图建议、标题字体的选择、主色调建议。",
    placeholder: "比如：一篇关于独居生活好物分享的笔记...",
    inputLabel: "描述你的内容主题和核心卖点"
  },
  {
    id: "community_moderator",
    name: "评论区气氛组",
    description: "设计能引发讨论的“槽点”或“问答”，提升互动率。",
    icon: "MessageSquareQuote",
    prompt: "你是一位精通社区运营的专家。请为这篇笔记设计 3 个能够引发大量评论的“互动埋点”或者一个让人忍不住想反驳/补充的问题。",
    placeholder: "比如：一篇关于如何科学喂养猫咪的干货...",
    inputLabel: "输入你的笔记内容概要"
  },
  {
    id: "trending_scout",
    name: "热点/流行狙击手",
    description: "捕捉当下最火的“热梗”和“话题”，让你的内容自带流量。",
    icon: "WandSparkles",
    prompt: "你是一位流行文化观察员。请分析当前小红书上相关的热门趋势、常用梗或爆火的话题角度，并建议如何将这些元素无缝融入到用户的内容中。",
    placeholder: "比如：最近关于‘脆皮大学生’或者‘精致穷’的话题...",
    inputLabel: "输入你关注的行业或初步选题"
  }
];

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  return (
    <Button 
      size="icon" 
      variant="ghost" 
      className={cn("h-6 w-6", className)}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Clipboard className="h-3 w-3" />}
    </Button>
  );
}

function StrategySection({ body }: { body: string }) {
  // Extract first comments
  const comments = body.match(/💬 首评策略（.*?）：(.*?)$/gm)?.map(m => m.split('）：')[1]) || [];
  
  // Extract interaction scripts
  const scriptsMatch = body.match(/🔥 互动问答脚本：\n([\s\S]*?)(?=\n\n|\n👥|$)/);
  const scripts = scriptsMatch?.[1].trim().split('\n').filter(s => s.startsWith('- ')).map(s => s.substring(2)) || [];

  if (comments.length === 0 && scripts.length === 0) return null;

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {comments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="flex items-center text-[11px] font-bold text-blue-600 uppercase">
              <MessageSquare className="mr-1 h-3 w-3" />
              首评策略 (Comment Variants)
            </h5>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {comments.map((c, i) => (
              <div key={i} className="group relative rounded-md border bg-blue-50/20 p-2 text-[11px] transition-colors hover:bg-blue-50/50">
                <p className="pr-8 text-muted-foreground">{c}</p>
                <CopyButton text={c} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {scripts.length > 0 && (
        <div className="space-y-2">
          <h5 className="flex items-center text-[11px] font-bold text-emerald-600 uppercase">
            <Zap className="mr-1 h-3 w-3" />
            互动回复脚本 (Interaction Q&A)
          </h5>
          <div className="space-y-1.5">
            {scripts.map((s, i) => {
              const parts = s.split('-> AI回复：');
              const query = parts[0] || "";
              const reply = parts[1] || "";
              return (
                <div key={i} className="rounded-md border border-emerald-100 bg-emerald-50/30 p-2 text-[11px]">
                  <div className="mb-1 text-muted-foreground opacity-70 italic">{query}</div>
                  <div className="group relative flex items-start gap-2">
                    <div className="flex-1 font-medium text-emerald-900">{reply}</div>
                    <CopyButton text={reply} className="opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  children = [],
  isExpanded,
  onToggleExpand,
  isSelected,
  onToggleSelect,
  onPublish,
  isChild = false
}: {
  asset: ContentAssetView;
  children?: ContentAssetView[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPublish?: (asset: ContentAssetView) => void;
  isChild?: boolean;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const {
    copyText,
    setPreviewNote,
    setIsSimulatorPinned,
    runPrePublishCheck,
    deleteItem,
    rewriteAsset,
    toggleFavorite,
    updateAssetStatus,
    checkingAssetId,
    rewritingAssetId,
    isGeneratingImageId,
    prePublishChecks
  } = (window as any).workbenchActions || {};
  const check = prePublishChecks?.[asset.id] as PrePublishCheckOutput | undefined;
  const readiness = getAssetReadiness(asset, check);

  function openPreview(pin = false) {
    const previewImages = extractPreviewImages(asset);
    setPreviewNote?.({
      title: asset.title,
      content: asset.body,
      coverText: asset.coverText || asset.title,
      coverImage: asset.coverImage ? getPreviewImageUrl(asset.coverImage) : undefined,
      coverImages: previewImages
    });
    if (pin) {
      setIsSimulatorPinned?.(true);
    }
  }

  function chooseCoverImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const updateAssetCover = (window as any).workbenchActions?.updateAssetCover;
        updateAssetCover?.(asset.id, readerEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col rounded-xl border bg-card transition-all hover:shadow-md",
        isSelected && "border-primary ring-1 ring-primary",
        isChild && "ml-6 mt-2 border-dashed border-muted-foreground/30 bg-muted/5"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="mt-1 flex flex-col gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={isSelected}
            onChange={onToggleSelect}
          />
          <button
            type="button"
            className={cn("text-muted-foreground transition-colors hover:text-amber-500", asset.isFavorite && "text-amber-500")}
            onClick={() => toggleFavorite?.(asset)}
          >
            <Star className={cn("h-4 w-4", asset.isFavorite && "fill-current")} />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{asset.type === "note" ? "图文笔记" : "视频脚本"}</Badge>
              <Badge variant="secondary" className="text-[10px] uppercase opacity-70">
                {asset.source}
              </Badge>
              <select
                className={cn(
                  "h-6 rounded-full border px-2 text-[10px] font-medium outline-none",
                  asset.status === "draft" && "border-slate-200 bg-slate-50 text-slate-600",
                  asset.status === "ready" && "border-blue-200 bg-blue-50 text-blue-600",
                  asset.status === "published" && "border-emerald-200 bg-emerald-50 text-emerald-600"
                )}
                value={asset.status}
                onChange={(e) => updateAssetStatus?.(asset, e.target.value)}
              >
                <option value="draft">待打磨</option>
                <option value="ready">待发布</option>
                <option value="published">已发布</option>
              </select>
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(asset.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="min-w-0">
            <h4 className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{asset.title}</h4>
            <pre className="mt-1 max-h-32 max-w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">
              {asset.body || "正文为空，请重新生成这条内容。"}
            </pre>
          </div>

          <AssetMetaPanel asset={asset} />

          {asset.type === "note" ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium">发布就绪度 {readiness.doneCount}/{readiness.total}</div>
                <Badge variant={readiness.isReady ? "default" : "outline"}>
                  {readiness.isReady ? "可发布" : `下一步：${readiness.nextLabel}`}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {readiness.items.map((item) => (
                  <Badge key={item.key} variant={item.done ? "secondary" : "outline"} className="text-[10px]">
                    {item.done ? "✓" : "待"} {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {asset.type === "note" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => openPreview()}
                >
                  <Smartphone className="mr-1 h-3.5 w-3.5" />
                  预览
                </Button>
                <Button
                  size="sm"
                  variant={readiness.nextKey === "check" ? "default" : "outline"}
                  className="h-8 px-2 text-xs"
                  disabled={checkingAssetId === asset.id}
                  onClick={() => runPrePublishCheck?.(asset)}
                >
                  <Gauge className="mr-1 h-3.5 w-3.5" />
                  体检
                </Button>
                <Button
                  size="sm"
                  variant={readiness.isReady ? "default" : "outline"}
                  className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => onPublish?.(asset)}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  发布
                </Button>
              </>
            )}
            {asset.type !== "note" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                disabled={checkingAssetId === asset.id}
                onClick={() => runPrePublishCheck?.(asset)}
              >
                <Gauge className="mr-1 h-3.5 w-3.5" />
                体检
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setIsMoreOpen((current) => !current)}>
              <PanelsTopLeft className="mr-1 h-3.5 w-3.5" />
              更多
            </Button>
          </div>

          {isMoreOpen ? (
            <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-2">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => copyText?.(asset.body)}>
                <Clipboard className="mr-1 h-3.5 w-3.5" />
                复制正文
              </Button>
              {asset.type === "note" ? (
                <>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => openPreview(true)}>
                    <Smartphone className="mr-1 h-3.5 w-3.5" />
                    常驻预览
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={chooseCoverImage}>
                    <ImageIcon className="mr-1 h-3.5 w-3.5" />
                    上传配图
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                    disabled={isGeneratingImageId === asset.id}
                    onClick={() => {
                      const generateCover = (window as any).workbenchActions?.generateAssetCover;
                      generateCover?.(asset);
                    }}
                  >
                    {isGeneratingImageId === asset.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                    )}
                    AI 生图
                  </Button>
                </>
              ) : null}
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive hover:bg-destructive/5" onClick={() => deleteItem?.("assets", asset.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除
              </Button>
            </div>
          ) : null}

          {!isChild && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">改写变体 (Rewrites)</span>
              {REWRITE_OPTIONS.map((option) => (
                <Button
                  key={option.mode}
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-[10px]"
                  disabled={rewritingAssetId === asset.id}
                  onClick={() => rewriteAsset?.(asset, option.mode)}
                >
                  <WandSparkles className="mr-1 h-3 w-3" />
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          {prePublishChecks?.[asset.id] && (
            <div className="mt-2 rounded-lg border bg-muted/50 p-3 text-xs">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Gauge className="h-3.5 w-3.5" />
                体检建议
              </div>
              <p className="mb-3 text-muted-foreground">{prePublishChecks[asset.id].overallSuggestion}</p>
              
              <div className="space-y-1.5">
                {prePublishChecks[asset.id].checks.map((check: PrePublishCheckOutput["checks"][number], idx: number) => (
                  <div key={idx} className="flex gap-2">
                    {check.status === "good" ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : check.status === "watch" ? (
                      <AlertCircle className="h-3 w-3 shrink-0 text-orange-500" />
                    ) : (
                      <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                    )}
                    <div className="leading-tight">
                      <span className="font-semibold">{check.name}: </span>
                      <span className="text-muted-foreground">{check.advice}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {prePublishChecks[asset.id].optimizedContent && (
                <div className="mt-3 border-t border-orange-200 pt-3">
                  <div className="mb-2 text-[10px] font-bold text-orange-600 uppercase">✨ 发现更优合规版本</div>
                  <div className="rounded border border-orange-200 bg-orange-50 p-2 text-[10px]">
                    {prePublishChecks[asset.id].optimizedContent?.title && (
                      <div className="mb-1"><span className="font-bold">新标题：</span>{prePublishChecks[asset.id].optimizedContent?.title}</div>
                    )}
                    {prePublishChecks[asset.id].optimizedContent?.body && (
                      <div className="line-clamp-2 italic opacity-70">{prePublishChecks[asset.id].optimizedContent?.body}</div>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 h-7 w-full border-orange-500/50 text-[10px] text-orange-700 hover:bg-orange-100"
                    onClick={() => {
                      const applyFix = (window as any).workbenchActions?.applyPrePublishFix;
                      applyFix?.(asset.id, prePublishChecks[asset.id].optimizedContent!);
                    }}
                  >
                    <WandSparkles className="mr-1 h-3 w-3" />
                    一键应用优化文案
                  </Button>
                </div>
              )}
            </div>
          )}
          <StrategySection body={asset.body} />
        </div>
      </div>

      {children.length > 0 && (
        <div className="border-t bg-muted/5 p-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-foreground"
            onClick={onToggleExpand}
          >
            {isExpanded ? "收起改写版本" : `显示 ${children.length} 个改写版本`}
            <Sparkles className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
          </button>

          {isExpanded && (
            <div className="space-y-2 pb-2">
              {children.map((child) => (
                <AssetCard
                  key={child.id}
                  asset={child}
                  isSelected={isSelected}
                  onToggleSelect={onToggleSelect}
                  onPublish={onPublish}
                  isChild
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function hasAssetMeta(asset: ContentAssetView) {
  const meta = asset.meta ?? {};
  return Boolean(
    asset.coverText ||
    meta.visualSuggestion ||
    meta.shootingSuggestion ||
    meta.targetAudience ||
    meta.riskTip ||
    meta.evidenceScene ||
    meta.concreteDetail ||
    meta.mildDrawback ||
    meta.fitBoundary ||
    meta.interactionQuestion ||
    meta.firstCommentVariants?.length ||
    meta.interactionScripts?.length
  );
}

function AssetMetaPanel({ asset }: { asset: ContentAssetView }) {
  const meta = asset.meta ?? {};
  const firstComments = meta.firstCommentVariants ?? [];
  const scripts = meta.interactionScripts ?? [];

  if (!hasAssetMeta(asset)) return null;

  return (
    <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground sm:grid-cols-2">
      {asset.coverText ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">封面文案</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{asset.coverText}</p>
        </div>
      ) : null}
      {meta.visualSuggestion ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">封面视觉建议</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.visualSuggestion}</p>
        </div>
      ) : null}
      {meta.shootingSuggestion ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">拍摄建议</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.shootingSuggestion}</p>
        </div>
      ) : null}
      {firstComments.length > 0 ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">首评策略</div>
          <div className="mt-1 space-y-1">
            {firstComments.slice(0, 3).map((comment, index) => (
              <p key={`${asset.id}-comment-${index}`} className="break-words [overflow-wrap:anywhere]">{comment}</p>
            ))}
          </div>
        </div>
      ) : null}
      {scripts.length > 0 ? (
        <div className="min-w-0 sm:col-span-2">
          <div className="font-medium text-foreground">互动脚本</div>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {scripts.slice(0, 4).map((script, index) => (
              <div key={`${asset.id}-script-${index}`} className="rounded-md bg-background/70 p-2">
                {script.scenario ? <div className="font-medium text-foreground">{script.scenario}</div> : null}
                <p className="break-words [overflow-wrap:anywhere]">{script.userQuery}</p>
                {script.aiReply ? <p className="mt-1 break-words text-muted-foreground/80 [overflow-wrap:anywhere]">{script.aiReply}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {meta.targetAudience ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">适合人群</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.targetAudience}</p>
        </div>
      ) : null}
      {meta.riskTip ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">风险提醒</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.riskTip}</p>
        </div>
      ) : null}
      {meta.evidenceScene ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">真实场景</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.evidenceScene}</p>
        </div>
      ) : null}
      {meta.concreteDetail ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">具体细节</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.concreteDetail}</p>
        </div>
      ) : null}
      {meta.mildDrawback ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">轻微缺点</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.mildDrawback}</p>
        </div>
      ) : null}
      {meta.fitBoundary ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">适用边界</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.fitBoundary}</p>
        </div>
      ) : null}
      {meta.interactionQuestion ? (
        <div className="min-w-0">
          <div className="font-medium text-foreground">互动问题</div>
          <p className="mt-1 break-words [overflow-wrap:anywhere]">{meta.interactionQuestion}</p>
        </div>
      ) : null}
    </div>
  );
}

function PublishCheckRow({
  status,
  label,
  detail
}: {
  status: "good" | "watch" | "fix";
  label: string;
  detail: string;
}) {
  const Icon = status === "good" ? CheckCircle2 : status === "watch" ? AlertCircle : XCircle;
  return (
    <div className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
      <Icon className={cn(
        "mt-0.5 h-4 w-4 shrink-0",
        status === "good" && "text-emerald-500",
        status === "watch" && "text-orange-500",
        status === "fix" && "text-destructive"
      )} />
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="mt-0.5 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{detail}</div>
      </div>
    </div>
  );
}

function XiaohongshuPublishAssistant({
  asset,
  onClose,
  copyText,
  check
}: {
  asset: ContentAssetView;
  onClose: () => void;
  copyText: (text: string) => void | Promise<void>;
  check?: PrePublishCheckOutput;
}) {
  const images = extractPreviewImages(asset);
  const tags = getAssetTagList(asset);
  const publishBody = getPublishBody(asset);
  const titleUnits = getXiaohongshuTitleUnits(asset.title);
  const bodyLength = publishBody.length;
  const titleStatus = titleUnits <= 20 ? "good" : titleUnits <= 24 ? "watch" : "fix";
  const bodyStatus = asset.body.trim() && bodyLength <= 1000 ? "good" : asset.body.trim() ? "watch" : "fix";
  const imageStatus = images.length > 0 && images.length <= 18 ? "good" : images.length > 18 ? "fix" : "fix";
  const tagStatus = tags.length > 0 ? "good" : "watch";
  const readiness = getAssetReadiness(asset, check);
  const pack = getPublishPack(asset);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">发布助手</Badge>
              <Badge variant={titleStatus === "fix" || bodyStatus === "fix" || imageStatus === "fix" ? "secondary" : "outline"}>
                {titleStatus === "fix" || bodyStatus === "fix" || imageStatus === "fix" ? "需处理" : "可准备发布"}
              </Badge>
              <Badge variant={readiness.isReady ? "default" : "outline"}>就绪度 {readiness.doneCount}/{readiness.total}</Badge>
            </div>
            <h2 className="mt-2 break-words text-lg font-semibold [overflow-wrap:anywhere]">{asset.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">检查发布限制，整理复制包，然后去小红书创作平台手动确认发布。</p>
          </div>
          <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 border-b p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">发布就绪度</div>
                <div className="text-xs text-muted-foreground">{readiness.doneCount}/{readiness.total}</div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", readiness.isReady ? "bg-emerald-500" : "bg-orange-500")}
                  style={{ width: `${(readiness.doneCount / readiness.total) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {readiness.items.map((item) => (
                  <Badge key={item.key} variant={item.done ? "secondary" : "outline"} className="text-[10px]">
                    {item.done ? "✓" : "待"} {item.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <PublishCheckRow
                status={titleStatus}
                label="标题长度"
                detail={`当前约 ${titleUnits} 字符单位，小红书发布建议不超过 20。`}
              />
              <PublishCheckRow
                status={bodyStatus}
                label="正文长度"
                detail={asset.body.trim() ? `当前正文+标签 ${bodyLength} 字，建议不超过 1000。` : "正文为空，先重新生成或改写。"}
              />
              <PublishCheckRow
                status={imageStatus}
                label="图片"
                detail={images.length > 0 ? `已准备 ${images.length} 张图，图文笔记最多 18 张。` : "还没有配图，图文笔记发布前需要至少 1 张图片。"}
              />
              <PublishCheckRow
                status={tagStatus}
                label="标签"
                detail={tags.length > 0 ? `已识别 ${tags.length} 个标签：${tags.map((tag) => `#${tag}`).join(" ")}` : "建议补充话题、品类、人群、场景标签。"}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => copyText(asset.title)}>
                <Clipboard className="h-4 w-4" />
                复制标题
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyText(publishBody)}>
                <Clipboard className="h-4 w-4" />
                复制正文+标签
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadFile(`${asset.title || "xiaohongshu-publish"}.txt`, pack, "text/plain")}>
                <Download className="h-4 w-4" />
                下载发布包
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.open("https://creator.xiaohongshu.com", "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-4 w-4" />
                打开创作平台
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              这里不会自动点击发布。最终发布仍由你在小红书官方页面确认，避免账号风控和误发。
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 text-sm font-medium">发布正文</div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                {publishBody || "正文为空，请重新生成这条内容。"}
              </pre>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">图片</div>
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.slice(0, 18).map((image, index) => (
                    <div key={`${image}-${index}`} className="aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="没有图片" description="先给资产配图或生成封面，再发布到小红书。" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Workbench() {
  const [activeTab, setActiveTab] = useState<TabKey>("generate");
  const [assets, setAssets] = useState<ContentAssetView[]>([]);
  const [xiaohongshuExtractions, setXiaohongshuExtractions] = useState<XiaohongshuExtractionView[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemView[]>([]);
  const [workflowType, setWorkflowType] = useState<WorkflowType>("thirty_notes");
  const [brief, setBrief] = useState<StructuredBrief>(defaultBrief);
  const [contentGoal, setContentGoal] = useState(contentGoals[1]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGeneratingImageId, setIsGeneratingImageId] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<WorkflowOutput | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfigView | null>(null);
  const [modelForm, setModelForm] = useState({
    providerId: "openai",
    apiKey: "",
    model: "gpt-5.2",
    baseURL: ""
  });
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(defaultAccountProfile);
  const [contentRules, setContentRules] = useState<ContentRulesConfig>({
    xiaohongshuGraphicRules: DEFAULT_XIAOHONGSHU_GRAPHIC_RULES
  });
  const [contentRuleText, setContentRuleText] = useState(DEFAULT_XIAOHONGSHU_GRAPHIC_RULES.join("\n"));
  const [previewNote, setPreviewNote] = useState<{ 
    title: string; 
    content: string;
    coverText?: string;
    coverImage?: string;
    coverImages?: string[];
  } | null>(null);
  const [publishAsset, setPublishAsset] = useState<ContentAssetView | null>(null);
  const [postGenerateAssetIds, setPostGenerateAssetIds] = useState<string[]>([]);
  const [rewritingAssetId, setRewritingAssetId] = useState<string | null>(null);
  const [titleWorkshop, setTitleWorkshop] = useState<TitleWorkshopOutput | null>(null);
  const [preferredTitleStyles, setPreferredTitleStyles] = useState<TitleStyle[]>(
    TITLE_STYLE_OPTIONS.map((item) => item.id)
  );
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [checkingAssetId, setCheckingAssetId] = useState<string | null>(null);
  const [prePublishChecks, setPrePublishChecks] = useState<Record<string, PrePublishCheckOutput>>({});
  const [assetViewMode, setAssetViewMode] = useState<"list" | "grid">("list");
  const [briefMode, setBriefMode] = useState<"quick" | "pro">("quick");
  const [isSimulatorPinned, setIsSimulatorPinned] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [expandedAssetIds, setExpandedAssetIds] = useState<string[]>([]);
  const [expertSkills, setExpertSkills] = useState<ExpertSkill[]>([]);
  const [currentSkillId, setCurrentSkillId] = useState<string>("");
  const [skillInput, setSkillInput] = useState("");
  const [skillSession, setSkillSession] = useState<ExpertSession | null>(null);
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [isImportingSkill, setIsImportingSkill] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [referenceContent, setReferenceContent] = useState("");
  const [xiaohongshuUrl, setXiaohongshuUrl] = useState("");
  const [isExtractingXiaohongshu, setIsExtractingXiaohongshu] = useState(false);
  const [xiaohongshuExtracted, setXiaohongshuExtracted] = useState<XiaohongshuExtractionView | null>(null);
  const [xiaohongshuSearchTerm, setXiaohongshuSearchTerm] = useState("");
  const [xiaohongshuTagFilter, setXiaohongshuTagFilter] = useState("all");
  const [showFavoriteExtractionsOnly, setShowFavoriteExtractionsOnly] = useState(false);
  const [analyzingExtractionId, setAnalyzingExtractionId] = useState<string | null>(null);

  useEffect(() => {
    (window as any).workbenchActions = {
      copyText,
      setPreviewNote,
      setIsSimulatorPinned,
      runPrePublishCheck,
      deleteItem,
      rewriteAsset,
      toggleFavorite,
      updateAssetStatus,
      updateAssetCover,
      applyPrePublishFix,
      generateAssetCover,
      checkingAssetId,
      rewritingAssetId,
      isGeneratingImageId,
      prePublishChecks
    };
  }, [checkingAssetId, rewritingAssetId, prePublishChecks]);

  async function loadAll() {
    setIsBootstrapping(true);
    setError(null);
    try {
      const [assetsRes, calendarRes, xiaohongshuRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/calendar"),
        fetch("/api/xiaohongshu")
      ]);
      const [assetsData, calendarData, xiaohongshuData] = await Promise.all([
        assetsRes.json(),
        calendarRes.json(),
        xiaohongshuRes.json()
      ]);

      if (!assetsRes.ok) throw new Error(assetsData.error ?? "内容资产加载失败。");
      if (!calendarRes.ok) throw new Error(calendarData.error ?? "内容日历加载失败。");
      if (!xiaohongshuRes.ok) throw new Error(xiaohongshuData.error ?? "图文提取记录加载失败。");

      setAssets((assetsData.assets ?? []) as ContentAssetView[]);
      setCalendarItems((calendarData.items ?? []) as CalendarItemView[]);
      setXiaohongshuExtractions((xiaohongshuData.extractions ?? []) as XiaohongshuExtractionView[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "数据加载失败。");
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function loadSkills() {
    try {
      const response = await fetch("/api/skills");
      const data = await response.json();
      if (data.skills && data.skills.length > 0) {
        setExpertSkills(data.skills);
        setCurrentSkillId(data.skills[0].id);
      } else {
        // Seed default skills if empty
        let successCount = 0;
        for (const skill of DEFAULT_SKILLS) {
          const { id, ...skillData } = skill;
          const res = await fetch("/api/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(skillData)
          });
          if (res.ok) successCount++;
        }
        
        if (successCount > 0) {
          // Only retry once if at least one skill was seeded
          const secondResponse = await fetch("/api/skills");
          const secondData = await secondResponse.json();
          if (secondData.skills && secondData.skills.length > 0) {
            setExpertSkills(secondData.skills);
            setCurrentSkillId(secondData.skills[0].id);
          }
        } else {
          // If seeding failed, fallback to default skills in UI state
          setExpertSkills(DEFAULT_SKILLS);
          setCurrentSkillId(DEFAULT_SKILLS[0].id);
          console.warn("Database seeding failed, falling back to local defaults.");
        }
      }
    } catch (e) {
      console.error("Failed to load skills", e);
      // Fallback
      setExpertSkills(DEFAULT_SKILLS);
      setCurrentSkillId(DEFAULT_SKILLS[0].id);
    }
  }

  async function importSkill() {
    try {
      const parsed = JSON.parse(importJson);
      const skillsToImport = Array.isArray(parsed) ? parsed : [parsed];

      for (const skill of skillsToImport) {
        await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(skill)
        });
      }
      
      setImportJson("");
      setIsImportingSkill(false);
      await loadSkills();
      setMessage("技能导入成功。");
    } catch (e) {
      setError("导入失败：JSON 格式不正确。");
    }
  }

  async function deleteSkill(id: string) {
    if (!confirm("确认删除该专家技能？")) return;
    try {
      await fetch(`/api/skills?id=${id}`, { method: "DELETE" });
      await loadSkills();
      setMessage("技能已删除。");
    } catch (e) {
      setError("删除失败。");
    }
  }

  useEffect(() => {
    void loadAll();
    void loadModelConfig();
    void loadAccountProfile();
    void loadContentRules();
    void loadSkills();
  }, []);

  async function loadModelConfig() {
    try {
      const response = await fetch("/api/model-config");
      const data = (await response.json()) as ModelConfigView & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "模型配置加载失败。");
      }

      setModelConfig(data);
      setModelForm((current) => ({
        ...current,
        providerId: data.activeProviderId,
        model: data.activeModel,
        baseURL: data.activeProviderId === "custom" ? data.activeBaseURL : ""
      }));
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : "模型配置加载失败。");
    }
  }

  async function loadAccountProfile() {
    try {
      const response = await fetch("/api/account-profile");
      const data = (await response.json()) as { profile?: AccountProfile; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "账号设置加载失败。");
      }

      setAccountProfile(data.profile);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "账号设置加载失败。");
    }
  }

  async function loadContentRules() {
    try {
      const response = await fetch("/api/content-rules");
      const data = (await response.json()) as { rules?: ContentRulesConfig; error?: string };
      if (!response.ok || !data.rules) {
        throw new Error(data.error ?? "内容规则加载失败。");
      }

      const rules = normalizeXiaohongshuGraphicRules(data.rules.xiaohongshuGraphicRules);
      setContentRules({ xiaohongshuGraphicRules: rules });
      setContentRuleText(rules.join("\n"));
    } catch (rulesError) {
      setError(rulesError instanceof Error ? rulesError.message : "内容规则加载失败。");
    }
  }

  function updateBrief<K extends keyof StructuredBrief>(field: K, value: StructuredBrief[K]) {
    setBrief((current) => ({ ...current, [field]: value }));
  }

  function applyTemplate(title: string) {
    const template = WORKFLOW_TEMPLATES.find((item) => item.title === title);
    if (!template) return;

    setWorkflowType(template.workflowType);
    setBrief(template.brief);
  }

  function updateAccountProfile<K extends keyof AccountProfile>(field: K, value: AccountProfile[K]) {
    setAccountProfile((current) => ({ ...current, [field]: value }));
  }

  function resetContentRuleText() {
    setContentRuleText(DEFAULT_XIAOHONGSHU_GRAPHIC_RULES.join("\n"));
  }

  function selectProvider(providerId: string) {
    const provider = modelConfig?.providers.find((item) => item.id === providerId);
    if (!provider) return;

    setModelForm((current) => ({
      ...current,
      providerId,
      model: provider.defaultModel,
      baseURL: providerId === "custom" ? current.baseURL || "https://api.example.com/v1" : ""
    }));
  }

  async function saveModelSettings() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm)
      });
      const data = (await response.json()) as ModelConfigView & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "模型配置保存失败。");
      }

      setModelConfig(data);
      setMessage(`已切换到 ${data.activeProviderName} / ${data.activeModel}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "模型配置保存失败。");
    }
  }

  async function saveAccountProfileSettings() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountProfile)
      });
      const data = (await response.json()) as { profile?: AccountProfile; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "账号设置保存失败。");
      }

      setAccountProfile(data.profile);
      setMessage("账号人设已保存，后续生成会自动带上这些设定。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "账号设置保存失败。");
    }
  }

  async function saveContentRulesSettings() {
    setError(null);
    setMessage(null);

    const rules = normalizeXiaohongshuGraphicRules(
      contentRuleText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    );

    try {
      const response = await fetch("/api/content-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xiaohongshuGraphicRules: rules })
      });
      const data = (await response.json()) as { rules?: ContentRulesConfig; error?: string };
      if (!response.ok || !data.rules) {
        throw new Error(data.error ?? "内容规则保存失败。");
      }

      const savedRules = normalizeXiaohongshuGraphicRules(data.rules.xiaohongshuGraphicRules);
      setContentRules({ xiaohongshuGraphicRules: savedRules });
      setContentRuleText(savedRules.join("\n"));
      setMessage("小红书图文规则已保存，后续生成、标题和体检会按新规则执行。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "内容规则保存失败。");
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("已复制到剪贴板。");
  }

  async function extractXiaohongshuLink() {
    const url = xiaohongshuUrl.trim();
    if (!url) {
      setError("请先粘贴小红书链接。");
      return;
    }

    setIsExtractingXiaohongshu(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/xiaohongshu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = (await response.json()) as {
        extraction?: XiaohongshuExtractionView;
        error?: string;
      };

      if (!response.ok || !data.extraction) {
        throw new Error(data.error ?? "小红书链接提取失败。");
      }

      setXiaohongshuExtractions((current) => [data.extraction as XiaohongshuExtractionView, ...current]);
      setReferenceContent(data.extraction.text);
      setXiaohongshuExtracted(data.extraction);
      setMessage(`已提取并独立存储：${(data.extraction.images ?? []).length} 张图片，正文 ${data.extraction.text.length} 字。`);
      setActiveTab("xiaohongshu");
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "小红书链接提取失败。");
    } finally {
      setIsExtractingXiaohongshu(false);
    }
  }

  async function deleteXiaohongshuExtraction(id: string) {
    if (!confirm("确认删除这条提取记录？该操作不会影响资产库。")) return;

    try {
      const response = await fetch(`/api/xiaohongshu?id=${id}`, { method: "DELETE" });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "删除失败。");

      setXiaohongshuExtractions((current) => current.filter((item) => item.id !== id));
      setMessage("提取记录已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败。");
    }
  }

  async function updateXiaohongshuExtraction(
    id: string,
    patch: Partial<Pick<XiaohongshuExtractionView, "tags" | "isFavorite">>
  ) {
    try {
      const response = await fetch("/api/xiaohongshu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch })
      });
      const data = (await response.json()) as { extraction?: XiaohongshuExtractionView; error?: string };
      if (!response.ok || !data.extraction) throw new Error(data.error ?? "更新失败。");

      setXiaohongshuExtractions((current) =>
        current.map((item) => (item.id === data.extraction?.id ? data.extraction : item))
      );
      if (xiaohongshuExtracted?.id === data.extraction.id) {
        setXiaohongshuExtracted(data.extraction);
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新失败。");
    }
  }

  async function analyzeXiaohongshuExtraction(id: string) {
    setAnalyzingExtractionId(id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/xiaohongshu/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractionId: id })
      });
      const data = (await response.json()) as { extraction?: XiaohongshuExtractionView; error?: string };
      if (!response.ok || !data.extraction) throw new Error(data.error ?? "爆文拆解失败。");

      setXiaohongshuExtractions((current) =>
        current.map((item) => (item.id === data.extraction?.id ? data.extraction : item))
      );
      if (xiaohongshuExtracted?.id === data.extraction.id) {
        setXiaohongshuExtracted(data.extraction);
      }
      setMessage("爆文结构拆解已完成。");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "爆文拆解失败。");
    } finally {
      setAnalyzingExtractionId(null);
    }
  }

  async function runWorkflow() {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: workflowType,
          userInput: referenceContent.trim() 
            ? `参考爆文：\n${referenceContent}\n\n当前创作需求：\n${buildPrompt(contentGoal, brief, accountProfile)}`
            : buildPrompt(contentGoal, brief, accountProfile)
        })
      });

      const data = (await response.json()) as {
        output?: WorkflowOutput;
        persistence?: { assetCount: number; calendarCount: number; assetIds?: string[]; calendarIds?: string[] };
        error?: string;
      };

      if (!response.ok || !data.output) {
        throw new Error(data.error ?? "生成失败。");
      }

      setLastOutput(data.output);
      setPostGenerateAssetIds(data.persistence?.assetIds ?? []);
      setMessage(
        `生成完成：新增 ${data.persistence?.assetCount ?? 0} 条内容资产，${data.persistence?.calendarCount ?? 0} 条日历。`
      );
      await loadAll();
      setActiveTab(workflowType === "content_calendar" ? "calendar" : "assets");
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "生成失败。");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTitleStyle(style: TitleStyle) {
    setPreferredTitleStyles((current) => {
      if (current.includes(style)) {
        return current.length === 1 ? current : current.filter((item) => item !== style);
      }

      return [...current, style];
    });
  }

  async function runTitleWorkshop() {
    setIsGeneratingTitles(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/title-workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: buildPrompt(contentGoal, brief, accountProfile),
          preferredStyles: preferredTitleStyles
        })
      });
      const data = (await response.json()) as { output?: TitleWorkshopOutput; error?: string };
      if (!response.ok || !data.output) {
        throw new Error(data.error ?? "标题生成失败。");
      }

      const normalizedOutput = normalizeTitleWorkshopForClient(data.output);
      if (!normalizedOutput || normalizedOutput.titles.length === 0) {
        throw new Error("模型没有返回可用的标题建议，请重试。");
      }

      setTitleWorkshop(normalizedOutput);
      setMessage("标题工坊已生成一组可直接测试的新标题。");
    } catch (titleError) {
      setError(titleError instanceof Error ? titleError.message : "标题生成失败。");
    } finally {
      setIsGeneratingTitles(false);
    }
  }

  async function rewriteAsset(asset: ContentAssetView, mode: RewriteMode) {
    setRewritingAssetId(asset.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, mode })
      });
      const data = (await response.json()) as {
        asset?: ContentAssetView;
        summary?: string;
        error?: string;
      };

      if (!response.ok || !data.asset) {
        throw new Error(data.error ?? "改写失败。");
      }

      setAssets((current) => [data.asset as ContentAssetView, ...current]);
      setMessage(data.summary ?? "已生成新的改写版本。");
    } catch (rewriteError) {
      setError(rewriteError instanceof Error ? rewriteError.message : "改写失败。");
    } finally {
      setRewritingAssetId(null);
    }
  }

  async function runPrePublishCheck(asset: ContentAssetView) {
    setCheckingAssetId(asset.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/prepublish-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id })
      });
      const data = (await response.json()) as {
        output?: PrePublishCheckOutput;
        error?: string;
      };

      if (!response.ok || !data.output) {
        throw new Error(data.error ?? "发布前检查失败。");
      }

      setPrePublishChecks((current) => ({ ...current, [asset.id]: data.output as PrePublishCheckOutput }));
      setMessage("发布前检查已完成，可以直接看具体建议。");
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "发布前检查失败。");
    } finally {
      setCheckingAssetId(null);
    }
  }

  async function applyPrePublishFix(assetId: string, optimized: { title?: string; body?: string }) {
    if (!optimized) return;
    
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assetId,
          title: optimized.title,
          body: optimized.body
        })
      });

      if (!response.ok) throw new Error("Failed to apply fix");

      // Update local state
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId
            ? { ...a, title: optimized.title || a.title, body: optimized.body || a.body }
            : a
        )
      );
      
      // Clear the check since it's applied
      setPrePublishChecks(prev => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });

      setMessage("已成功应用 AI 优化建议！");
    } catch (err) {
      console.error("Fix application error:", err);
      setError("应用修改失败，请重试。");
    } finally {
      setCheckingAssetId(null);
    }
  }

  async function generateAssetCover(asset: ContentAssetView) {
    const suggestion = asset.meta?.visualSuggestion || asset.coverText || asset.title;

    setError(null);
    setIsGeneratingImageId(asset.id);
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: suggestion })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");

      // Update asset with new cover
      await updateAssetCover(asset.id, data.url);
      setMessage("AI 封面生成成功！");
    } catch (err: any) {
      console.error("Image generation error:", err);
      setError(`封面生成失败: ${err.message}`);
    } finally {
      setIsGeneratingImageId(null);
    }
  }

  async function updateCalendarItem(item: CalendarItemView, status: string) {
    setError(null);
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status })
      });
      const data = (await response.json()) as { item?: CalendarItemView; error?: string };
      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "日历更新失败。");
      }

      setCalendarItems((current) =>
        current.map((calendarItem) => (calendarItem.id === data.item?.id ? data.item : calendarItem))
      );
      setMessage("日历状态已更新。");
    } catch (calendarError) {
      setError(calendarError instanceof Error ? calendarError.message : "日历更新失败。");
    }
  }

  async function deleteItem(type: "assets" | "calendar", id: string) {
    if (!confirm("确认删除？该操作不可恢复。")) return;

    try {
      const response = await fetch(`/api/${type}?id=${id}`, { method: "DELETE" });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "删除失败。");
      }

      if (type === "assets") setAssets((current) => current.filter((item) => item.id !== id));
      if (type === "calendar") setCalendarItems((current) => current.filter((item) => item.id !== id));
      setMessage("删除成功。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败。");
    }
  }

  async function toggleFavorite(asset: ContentAssetView) {
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, isFavorite: !asset.isFavorite })
      });
      const data = (await response.json()) as { asset?: ContentAssetView; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "更新失败。");

      setAssets((current) => current.map((item) => (item.id === asset.id ? data.asset! : item)));
    } catch (favError) {
      setError(favError instanceof Error ? favError.message : "更新失败。");
    }
  }

  async function updateAssetStatus(asset: ContentAssetView, status: string) {
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, status })
      });
      const data = (await response.json()) as { asset?: ContentAssetView; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "状态更新失败。");

      setAssets((current) => current.map((item) => (item.id === asset.id ? data.asset! : item)));
      setMessage("资产状态已更新。");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "状态更新失败。");
    }
  }

  async function updateAssetCover(assetId: string, coverImage: string) {
    try {
      const response = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId, coverImage })
      });
      const data = (await response.json()) as { asset?: ContentAssetView; error?: string };
      if (!response.ok || !data.asset) throw new Error(data.error ?? "封面更新失败。");

      setAssets((current) => current.map((item) => (item.id === assetId ? data.asset! : item)));
      setMessage("封面图已更新，点击预览查看效果。");
    } catch (coverError) {
      setError(coverError instanceof Error ? coverError.message : "封面更新失败。");
    }
  }

  async function batchDeleteAssets() {
    if (selectedAssetIds.length === 0) return;
    if (!confirm(`确认批量删除这 ${selectedAssetIds.length} 项资产？该操作不可恢复。`)) return;

    try {
      const response = await fetch(`/api/assets?ids=${selectedAssetIds.join(",")}`, { method: "DELETE" });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "批量删除失败。");

      setAssets((current) => current.filter((item) => !selectedAssetIds.includes(item.id)));
      setSelectedAssetIds([]);
      setMessage("批量删除成功。");
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "批量删除失败。");
    }
  }

  async function batchPrePublishCheck() {
    if (selectedAssetIds.length === 0) return;
    const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id));
    
    setMessage(`正在对 ${selectedAssets.length} 项资产进行批量体检...`);
    for (const asset of selectedAssets) {
      await runPrePublishCheck(asset);
    }
    setMessage("批量体检完成！");
  }

  async function batchGenerateCovers() {
    if (selectedAssetIds.length === 0) return;
    const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id) && a.type === "note");
    
    if (selectedAssets.length === 0) {
      setError("所选资产中没有图文笔记，无法生成封面。");
      return;
    }

    setMessage(`正在为 ${selectedAssets.length} 篇笔记生成 AI 封面...`);
    for (const asset of selectedAssets) {
      await generateAssetCover(asset);
    }
    setMessage("批量封面生成完成！");
  }

  async function runExpertSkill() {
    const skill = expertSkills.find((s) => s.id === currentSkillId);
    if (!skill || !skillInput.trim()) return;

    setIsSkillLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expert_skill",
          userInput: `专家指令：${skill.prompt}\n\n用户输入：${skillInput}`
        })
      });

      const data = (await response.json()) as { output?: string; error?: string };
      if (!response.ok || !data.output) throw new Error(data.error ?? "专家诊断失败。");

      setSkillSession({
        skillId: currentSkillId,
        input: skillInput,
        output: data.output,
        timestamp: new Date().toISOString()
      });
      setMessage(`[${skill.name}] 已完成诊断。`);
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "专家诊断失败。");
    } finally {
      setIsSkillLoading(false);
    }
  }

  const getFilteredAssetTrees = () => {
    let filtered = assets;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) => a.title.toLowerCase().includes(lower) || a.body.toLowerCase().includes(lower)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((a) => a.type === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    // Build tree
    const rootAssets = filtered.filter((a) => !a.parentId);
    const childrenMap = new Map<string, ContentAssetView[]>();
    filtered.forEach((a) => {
      if (a.parentId) {
        const list = childrenMap.get(a.parentId) || [];
        list.push(a);
        childrenMap.set(a.parentId, list);
      }
    });

    return rootAssets.map((root) => ({
      ...root,
      children: childrenMap.get(root.id) || []
    }));
  };

  const assetTrees = getFilteredAssetTrees();
  const xiaohongshuTagOptions = Array.from(
    new Set(
      xiaohongshuExtractions.flatMap((item) =>
        (item.tags ?? "")
          .split(/[\s,，#]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    )
  );
  const filteredXiaohongshuExtractions = xiaohongshuExtractions.filter((item) => {
    const keyword = xiaohongshuSearchTerm.trim().toLowerCase();
    const haystack = [item.title, item.text, item.tags ?? "", (item.topics ?? []).join(" "), item.sourceUrl].join("\n").toLowerCase();
    const matchesKeyword = !keyword || haystack.includes(keyword);
    const tags = (item.tags ?? "").split(/[\s,，#]+/).map((tag) => tag.trim()).filter(Boolean);
    const matchesTag = xiaohongshuTagFilter === "all" || tags.includes(xiaohongshuTagFilter);
    const matchesFavorite = !showFavoriteExtractionsOnly || item.isFavorite;
    return matchesKeyword && matchesTag && matchesFavorite;
  });
  const normalizedTitleWorkshop = normalizeTitleWorkshopForClient(titleWorkshop);
  const titleWorkshopTitles = normalizedTitleWorkshop?.titles ?? [];
  const lastOutputNotes = lastOutput?.notes ?? [];
  const lastOutputCalendar = lastOutput?.calendar ?? [];
  const lastOutputScripts = lastOutput?.scripts ?? [];
  const lastOutputNextActions = lastOutput?.nextActions ?? [];
  const postGenerateAssets = postGenerateAssetIds
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is ContentAssetView => Boolean(asset));
  const primaryPostGenerateAsset = postGenerateAssets.find((asset) => asset.type === "note") ?? postGenerateAssets[0] ?? null;

  const tabs: NavItem[] = [
    { id: "generate", label: "AI生成", description: "结构化创作输入", icon: Sparkles },
    { id: "xiaohongshu", label: "图文提取", description: "小红书链接解析", icon: Link },
    { id: "calendar", label: "内容日历", description: "查看排期与主题", icon: CalendarDays },
    { id: "assets", label: "资产库", description: "复制、预览与二改", icon: FolderOpen },
    { id: "skills", label: "专家工具箱", description: "专项能力模拟", icon: MessageSquareQuote },
    { id: "settings", label: "模型设置", description: "切换模型供应商", icon: Settings }
  ];

  const activeNav = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveIcon = activeNav.icon;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-72 lg:shrink-0">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">内容生成工作台</div>
                  <p className="text-sm text-muted-foreground">更像创作者在用，而不是在手写 prompt</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-primary")} aria-hidden />
                    <div>
                      <div className="text-sm font-semibold">{tab.label}</div>
                      <div className="text-[10px] opacity-80">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <header className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ActiveIcon className="h-4 w-4" />
                  {activeNav.label}
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">把创作背景说清楚，再让 AI 干活</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  这版已经加入结构化输入和一键二改。先把受众、场景、痛点和语气讲清楚，再生成更像真人会发的内容。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="内容资产" value={assets.length} />
                <Stat label="提取素材" value={xiaohongshuExtractions.length} />
                <Stat label="日历条目" value={calendarItems.length} />
                <Stat label="笔记" value={assets.filter((asset) => asset.type === "note").length} />
              </div>
            </div>
          </header>

          {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">{message}</div> : null}
          {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

          {primaryPostGenerateAsset ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">刚生成：{primaryPostGenerateAsset.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    下一步建议先体检，再补图，最后打开发布助手确认标题、正文、标签和图片。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => runPrePublishCheck(primaryPostGenerateAsset)}>
                    <Gauge className="h-4 w-4" />
                    去体检
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const generateCover = (window as any).workbenchActions?.generateAssetCover;
                      generateCover?.(primaryPostGenerateAsset);
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    补配图
                  </Button>
                  <Button size="sm" onClick={() => setPublishAsset(primaryPostGenerateAsset)}>
                    <ExternalLink className="h-4 w-4" />
                    发布助手
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab("assets")}>
                    去资产库
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPostGenerateAssetIds([])}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {isBootstrapping ? (
            <Card>
              <CardContent className="flex min-h-48 items-center justify-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">正在加载工作台…</span>
              </CardContent>
            </Card>
          ) : null}

          {!isBootstrapping && activeTab === "generate" ? (
            <section className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    结构化创作输入
                  </CardTitle>
                  <CardDescription>先讲清楚给谁看、卖什么感觉、想达成什么结果。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3">
                    {workflowOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setWorkflowType(option.id)}
                          className={cn(
                            "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent",
                            workflowType === option.id && "border-primary bg-accent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {WORKFLOW_TEMPLATES.map((template) => (
                      <Button
                        key={template.title}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template.title)}
                      >
                        {template.title}
                      </Button>
                    ))}
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Layout className="h-4 w-4 text-primary" />
                      内置小红书图文规则
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {contentRules.xiaohongshuGraphicRules.map((rule) => (
                        <div key={rule} className="flex min-w-0 gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="break-words [overflow-wrap:anywhere]">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
                      <div>
                        <div className="text-sm font-medium">Brief 模式</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          快速模式先跑出一版，专业模式补充证据、竞品和发布边界。
                        </p>
                      </div>
                      <div className="inline-flex rounded-lg border bg-card p-1">
                        <button
                          type="button"
                          className={cn("rounded-md px-3 py-1.5 text-xs", briefMode === "quick" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
                          onClick={() => setBriefMode("quick")}
                        >
                          快速
                        </button>
                        <button
                          type="button"
                          className={cn("rounded-md px-3 py-1.5 text-xs", briefMode === "pro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
                          onClick={() => setBriefMode("pro")}
                        >
                          专业
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🎯 核心策略 (Core Strategy)</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">内容主题</span>
                          <input
                            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={brief.topic}
                            onChange={(event) => updateBrief("topic", event.target.value)}
                            placeholder="比如：宠物互动玩具种草"
                          />
                          <div className="text-[10px] text-muted-foreground text-right">{brief.topic.length}/20</div>
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium">产品名称</span>
                          <input
                            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={brief.productName}
                            onChange={(event) => updateBrief("productName", event.target.value)}
                            placeholder="比如：猫咪互动球 / 可拍照逗猫玩具"
                          />
                        </label>
                      </div>

                      {briefMode === "pro" ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                          <label className="space-y-1 text-sm">
                            <span className="font-medium">产品品类 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                            <input
                              className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={brief.productCategory}
                              onChange={(event) => updateBrief("productCategory", event.target.value)}
                              placeholder="比如：宠物玩具"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium">价格带 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                            <input
                              className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={brief.priceRange}
                              onChange={(event) => updateBrief("priceRange", event.target.value)}
                              placeholder="比如：百元内 / 中端"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium">账号阶段 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                            <input
                              className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={brief.accountStage}
                              onChange={(event) => updateBrief("accountStage", event.target.value)}
                              placeholder="比如：种草转化期"
                            />
                          </label>
                        </div>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">目标人群</span>
                          <input
                            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={brief.targetAudience}
                            onChange={(event) => updateBrief("targetAudience", event.target.value)}
                            placeholder="比如：新手养猫家庭"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">内容目标</span>
                          <select
                            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={contentGoal}
                            onChange={(event) => setContentGoal(event.target.value)}
                          >
                            {contentGoals.map((goal) => (
                              <option key={goal} value={goal}>
                                {goal}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium">内容形式</span>
                          <select
                            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={brief.contentForm}
                            onChange={(event) => updateBrief("contentForm", event.target.value)}
                          >
                            {contentForms.map((form) => (
                              <option key={form} value={form}>
                                {form}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    {briefMode === "pro" ? (
                    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🧾 产品证据 (Product Proof)</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">用户真实痛点</span>
                          <Textarea
                            value={brief.userPainPoint}
                            onChange={(event) => updateBrief("userPainPoint", event.target.value)}
                            placeholder="比如：买回来猫不爱玩、拍照不好看、很快被咬坏"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium">竞品差异</span>
                          <Textarea
                            value={brief.competitorDifference}
                            onChange={(event) => updateBrief("competitorDifference", event.target.value)}
                            placeholder="比如：比普通逗猫棒更适合猫咪自己玩，也更出片"
                          />
                        </label>
                      </div>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">证据 / 素材</span>
                        <Textarea
                          className="min-h-20"
                          value={brief.proofPoints}
                          onChange={(event) => updateBrief("proofPoints", event.target.value)}
                          placeholder="比如：用了两周、每天陪玩 15 分钟、阳台自然光拍照、猫咪扑咬反应"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium">必须出现的信息</span>
                        <Textarea
                          value={brief.mustMention}
                          onChange={(event) => updateBrief("mustMention", event.target.value)}
                          placeholder="比如：适合爱拍照的新手铲屎官；需要说明一个轻微缺点"
                        />
                      </label>
                    </div>
                    ) : null}

                    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">✨ 内容感知 (Content Vibe)</h3>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">核心卖点 / 钩子</span>
                        <Textarea
                          value={brief.coreSellingPoint}
                          onChange={(event) => updateBrief("coreSellingPoint", event.target.value)}
                          placeholder="比如：耐咬、互动性强、真实反应好拍、颜值高"
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">使用场景</span>
                          <Textarea
                            value={brief.useScene}
                            onChange={(event) => updateBrief("useScene", event.target.value)}
                            placeholder="比如：下班回家陪玩、周末在家消耗精力"
                          />
                        </label>

                        <label className="space-y-1 text-sm">
                          <span className="font-medium">情绪 / 痛点</span>
                          <Textarea
                            value={brief.emotionOrPainPoint}
                            onChange={(event) => updateBrief("emotionOrPainPoint", event.target.value)}
                            placeholder="比如：猫咪无聊拆家、新手养宠手忙脚乱、想给宠物最好的陪伴"
                          />
                        </label>
                      </div>

                      {briefMode === "pro" ? (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-1 text-sm">
                              <span className="font-medium">语气风格 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                              <Textarea
                                value={brief.toneStyle}
                                onChange={(event) => updateBrief("toneStyle", event.target.value)}
                                placeholder="比如：像有经验的朋友在真实分享"
                              />
                            </label>

                            <label className="space-y-1 text-sm">
                              <span className="font-medium">禁用表达 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                              <Textarea
                                value={brief.forbiddenWords}
                                onChange={(event) => updateBrief("forbiddenWords", event.target.value)}
                                placeholder="比如：绝对安全、闭眼买、保证爆单"
                              />
                            </label>
                          </div>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium">补充说明 <span className="text-xs font-normal text-muted-foreground">选填</span></span>
                            <Textarea
                              className="min-h-20"
                              value={brief.additionalNotes}
                              onChange={(event) => updateBrief("additionalNotes", event.target.value)}
                              placeholder="把这次特别在意的要求补进来，比如更口语、更多清单感、适合收藏等"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>

                    <div className="space-y-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                        <WandSparkles className="h-3 w-3" />
                        参考爆文 (Inspiration)
                      </h3>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-orange-700">粘贴参考内容 (可选)</span>
                        <Textarea
                          className="min-h-32 border-orange-500/30 focus-visible:ring-orange-500/50 bg-orange-500/5"
                          value={referenceContent}
                          onChange={(event) => setReferenceContent(event.target.value)}
                          placeholder="粘贴你想要模仿的小红书爆款文案。AI 将自动分析其爆款公式并迁移到你的新内容中。"
                        />
                      </label>
                    </div>
                  </div>

                  <Button disabled={isLoading || !brief.topic.trim()} onClick={runWorkflow}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    开始生成
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PanelsTopLeft className="h-4 w-4" />
                    标题工坊
                  </CardTitle>
                  <CardDescription>围绕当前 brief 快速出一组不同风格的标题，直接拿去测点击。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="mb-2 text-sm font-medium">本次创作 brief</div>
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {buildPrompt(contentGoal, brief, accountProfile)}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium">标题风格</div>
                    <div className="flex flex-wrap gap-2">
                      {TITLE_STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleTitleStyle(option.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            preferredTitleStyles.includes(option.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "bg-card text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    disabled={isGeneratingTitles || !brief.topic.trim()}
                    onClick={runTitleWorkshop}
                  >
                    {isGeneratingTitles ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquareQuote className="h-4 w-4" />
                    )}
                    生成标题
                  </Button>

                  {normalizedTitleWorkshop ? (
                    <div className="space-y-4 rounded-xl border p-4">
                      <div>
                        <div className="text-sm font-medium">标题建议</div>
                        <p className="mt-1 text-sm text-muted-foreground">{normalizedTitleWorkshop.summary}</p>
                      </div>

                      {titleWorkshopTitles.length > 0 ? (
                        <div className="space-y-3">
                          {titleWorkshopTitles.map((title, index) => (
                            <div key={`${title.text}-${index}`} className="rounded-lg border bg-muted/30 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{TITLE_STYLE_OPTIONS.find((item) => item.id === title.style)?.label ?? title.style}</Badge>
                                <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/30">
                                  爆款潜质: {title.scoreHint || "待评估"}
                                </Badge>
                              </div>
                              <div className="mt-2 text-sm font-medium">{title.text}</div>
                              {title.intent ? <div className="mt-1 text-xs text-muted-foreground">{title.intent}</div> : null}
                              <div className="mt-3">
                                <Button size="sm" variant="outline" onClick={() => copyText(title.text)}>
                                  <Clipboard className="h-4 w-4" />
                                  复制标题
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="没有可展示的标题"
                          description="模型返回结果缺少标题列表，请重新生成。"
                        />
                      )}
                    </div>
                  ) : null}

                  <div className="border-t pt-5">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4" />
                      <h3 className="text-sm font-medium">最近一次结果</h3>
                    </div>

                    {lastOutput ? (
                      <>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="笔记" value={lastOutputNotes.length} />
                        <Stat label="日历" value={lastOutputCalendar.length} />
                        <Stat label="脚本" value={lastOutputScripts.length} />
                        <Stat label="动作" value={lastOutputNextActions.length} />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium">内容摘要</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{lastOutput.summary}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium">下一步建议</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {lastOutputNextActions.map((item) => (
                            <Badge key={item}>{item}</Badge>
                          ))}
                        </div>
                      </div>

                      {lastOutputNotes[0] ? (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium">示例笔记预览</h3>
                            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                              {lastOutputNotes[0].body}
                            </pre>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border bg-emerald-500/5 p-3">
                              <div className="text-xs font-medium text-emerald-700">📸 封面视觉建议</div>
                              <p className="mt-1 text-sm">{lastOutputNotes[0].visualSuggestion}</p>
                            </div>
                            <div className="rounded-lg border bg-blue-500/5 p-3">
                              <div className="text-xs font-medium text-blue-700">💬 首评预设</div>
                              <p className="mt-1 text-sm">{lastOutputNotes[0].firstCommentVariants?.[0] ?? "暂无首评建议"}</p>
                            </div>
                            <div className="rounded-lg border bg-purple-500/5 p-3 sm:col-span-2">
                              <div className="text-xs font-medium text-purple-700">🔥 互动触发点</div>
                              <p className="mt-1 text-sm">
                                {lastOutputNotes[0].interactionScripts?.[0]?.userQuery ?? "暂无互动触发点"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      </>
                    ) : (
                      <EmptyState
                        title="还没有生成结果"
                        description="先把主题、受众、卖点和痛点填进去。结果会自动沉淀到资产库和内容日历。"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {!isBootstrapping && activeTab === "xiaohongshu" ? (
            <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    小红书图文提取
                  </CardTitle>
                  <CardDescription>粘贴公开笔记链接，提取正文和图片。结果只保存到这个页签，不进入资产库。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">小红书链接</span>
                      <div className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-3">
                        <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                        <input
                          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                          value={xiaohongshuUrl}
                          onChange={(event) => setXiaohongshuUrl(event.target.value)}
                          placeholder="https://www.xiaohongshu.com/explore/... 或 xhslink 短链"
                        />
                      </div>
                    </label>
                    <Button
                      type="button"
                      disabled={isExtractingXiaohongshu || !xiaohongshuUrl.trim()}
                      onClick={extractXiaohongshuLink}
                    >
                      {isExtractingXiaohongshu ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Images className="h-4 w-4" />
                      )}
                      提取并独立存储
                    </Button>
                  </div>

                  {xiaohongshuExtracted ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{(xiaohongshuExtracted.images ?? []).length} 张图片</Badge>
                        <Badge variant="outline">{(xiaohongshuExtracted.topics ?? []).length} 个话题</Badge>
                        <Badge variant="secondary">正文 {xiaohongshuExtracted.text.length} 字</Badge>
                      </div>
                      <div className="mt-2 font-medium">{xiaohongshuExtracted.title}</div>
                      {(xiaohongshuExtracted.topics ?? []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(xiaohongshuExtracted.topics ?? []).map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-[10px]">#{topic}</Badge>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{xiaohongshuExtracted.text}</p>
                    </div>
                  ) : (
                    <EmptyState title="等待提取" description="提取记录会独立保存，不会混入内容资产库。" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Images className="h-4 w-4" />
                      提取记录
                    </CardTitle>
                    <CardDescription>这里是独立素材池，适合复制原文、查看图片或作为爆文参考。</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{filteredXiaohongshuExtractions.length}/{xiaohongshuExtractions.length} 条</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filteredXiaohongshuExtractions.length === 0}
                      onClick={() => downloadFile("xiaohongshu-extractions.md", extractionsToMarkdown(filteredXiaohongshuExtractions), "text/markdown")}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Markdown
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filteredXiaohongshuExtractions.length === 0}
                      onClick={() => downloadFile("xiaohongshu-extractions.csv", extractionsToCsv(filteredXiaohongshuExtractions), "text/csv")}
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-3">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        value={xiaohongshuSearchTerm}
                        onChange={(event) => setXiaohongshuSearchTerm(event.target.value)}
                        placeholder="搜索标题、正文、标签或来源链接..."
                      />
                    </div>
                    <select
                      className="h-9 rounded-md border bg-card px-2 text-xs outline-none"
                      value={xiaohongshuTagFilter}
                      onChange={(event) => setXiaohongshuTagFilter(event.target.value)}
                    >
                      <option value="all">全部标签</option>
                      {xiaohongshuTagOptions.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant={showFavoriteExtractionsOnly ? "default" : "outline"}
                      className="h-9"
                      onClick={() => setShowFavoriteExtractionsOnly((current) => !current)}
                    >
                      <Star className={cn("h-3.5 w-3.5", showFavoriteExtractionsOnly && "fill-current")} />
                      只看收藏
                    </Button>
                  </div>

                  {xiaohongshuExtractions.length > 0 ? (
                    <div className="space-y-3">
                      {filteredXiaohongshuExtractions.map((item) => {
                        const previewImages = getExtractionPreviewImages(item);
                        return (
                          <div key={item.id} className="rounded-xl border bg-card p-4">
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <div className="grid h-24 w-24 shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-lg bg-muted">
                                {previewImages.slice(0, 4).map((image, index) => (
                                  <img key={`${item.id}-${index}`} src={image} alt="" className="h-full w-full object-cover" />
                                ))}
                                {previewImages.length === 0 ? (
                                  <div className="col-span-2 flex h-full items-center justify-center text-muted-foreground">
                                    <ImageIcon className="h-5 w-5" />
                                  </div>
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{previewImages.length} 图</Badge>
                                    {item.tags
                                      ? item.tags.split(/[\s,，#]+/).filter(Boolean).map((tag) => (
                                          <Badge key={tag} variant="secondary" className="text-[10px]">
                                            #{tag}
                                          </Badge>
                                        ))
                                      : null}
                                    {(item.topics ?? []).map((topic) => (
                                      <Badge key={`${item.id}-topic-${topic}`} variant="outline" className="text-[10px]">
                                        #{topic}
                                      </Badge>
                                    ))}
                                    <span className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className={cn("text-muted-foreground transition-colors hover:text-amber-500", item.isFavorite && "text-amber-500")}
                                    onClick={() => updateXiaohongshuExtraction(item.id, { isFavorite: !item.isFavorite })}
                                  >
                                    <Star className={cn("h-4 w-4", item.isFavorite && "fill-current")} />
                                  </button>
                                </div>
                                <h3 className="mt-2 break-words text-sm font-semibold [overflow-wrap:anywhere]">{item.title}</h3>
                                <p className="mt-1 line-clamp-3 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                  {item.text || "未提取到正文。"}
                                </p>
                                <label className="mt-3 flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 px-2">
                                  <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <input
                                    className="h-8 min-w-0 flex-1 bg-transparent text-xs outline-none"
                                    value={item.tags ?? ""}
                                    onChange={(event) =>
                                      setXiaohongshuExtractions((current) =>
                                        current.map((currentItem) =>
                                          currentItem.id === item.id ? { ...currentItem, tags: event.target.value } : currentItem
                                        )
                                      )
                                    }
                                    onBlur={(event) =>
                                      updateXiaohongshuExtraction(item.id, {
                                        tags: event.target.value.trim() || null
                                      })
                                    }
                                    placeholder="添加标签：避坑 宠物用品 成交型"
                                  />
                                </label>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => copyText(extractionToMarkdown(item))}>
                                <Clipboard className="h-3.5 w-3.5" />
                                复制图文
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setPreviewNote({
                                    title: item.title,
                                    content: extractionToMarkdown(item),
                                    coverText: item.title,
                                    coverImage: previewImages[0],
                                    coverImages: previewImages
                                  })
                                }
                              >
                                <Smartphone className="h-3.5 w-3.5" />
                                预览
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setReferenceContent(item.text)}>
                                <WandSparkles className="h-3.5 w-3.5" />
                                设为参考
                              </Button>
                              <Button
                                size="sm"
                                variant={item.analysis ? "secondary" : "ghost"}
                                disabled={analyzingExtractionId === item.id}
                                onClick={() => analyzeXiaohongshuExtraction(item.id)}
                              >
                                {analyzingExtractionId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Gauge className="h-3.5 w-3.5" />
                                )}
                                {item.analysis ? "重新拆解" : "AI拆解"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteXiaohongshuExtraction(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                删除
                              </Button>
                            </div>
                            {item.analysis ? (
                              <div className="mt-4 space-y-3 rounded-lg border bg-muted/25 p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge>{item.analysis.hookType}</Badge>
                                  <Badge variant="outline">爆文公式</Badge>
                                </div>
                                {item.analysis.summary ? (
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground">拆解摘要</div>
                                    <p className="mt-1 text-sm">{item.analysis.summary}</p>
                                  </div>
                                ) : null}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {item.analysis.titleAnalysis ? (
                                    <div className="rounded-md border bg-card p-3">
                                      <div className="text-xs font-semibold text-muted-foreground">标题钩子</div>
                                      <p className="mt-1 text-xs leading-relaxed">{item.analysis.titleAnalysis}</p>
                                    </div>
                                  ) : null}
                                  {item.analysis.openingAnalysis ? (
                                    <div className="rounded-md border bg-card p-3">
                                      <div className="text-xs font-semibold text-muted-foreground">开头留人</div>
                                      <p className="mt-1 text-xs leading-relaxed">{item.analysis.openingAnalysis}</p>
                                    </div>
                                  ) : null}
                                </div>
                                {(item.analysis.contentStructure ?? []).length > 0 ? (
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground">内容结构</div>
                                    <div className="mt-2 space-y-2">
                                      {(item.analysis.contentStructure ?? []).map((structure, index) => (
                                        <div key={`${item.id}-structure-${index}`} className="rounded-md border bg-card p-3 text-xs">
                                          {structure.section ? <div className="font-semibold">{index + 1}. {structure.section}</div> : null}
                                          {structure.purpose ? <div className="mt-1 text-muted-foreground">作用：{structure.purpose}</div> : null}
                                          {structure.originalSignal ? <div className="mt-1 text-muted-foreground">原文信号：{structure.originalSignal}</div> : null}
                                          {structure.reusableMove ? <div className="mt-1">可复用动作：{structure.reusableMove}</div> : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                                {item.analysis.reusableFormula ? (
                                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                                    <div className="text-xs font-semibold text-primary">可迁移公式</div>
                                    <p className="mt-1 text-sm">{item.analysis.reusableFormula}</p>
                                  </div>
                                ) : null}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {(item.analysis.sellingPoints ?? []).length > 0 ? (
                                    <div className="rounded-md border bg-card p-3">
                                      <div className="text-xs font-semibold text-muted-foreground">电商转化点</div>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(item.analysis.sellingPoints ?? []).map((point) => (
                                          <Badge key={point} variant="secondary" className="text-[10px]">{point}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                  {(item.analysis.emotionTriggers ?? []).length > 0 ? (
                                    <div className="rounded-md border bg-card p-3">
                                      <div className="text-xs font-semibold text-muted-foreground">情绪触发</div>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(item.analysis.emotionTriggers ?? []).map((point) => (
                                          <Badge key={point} variant="secondary" className="text-[10px]">{point}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                                {item.analysis.rewriteBrief?.targetAudience ||
                                item.analysis.rewriteBrief?.contentAngle ||
                                item.analysis.rewriteBrief?.emotionHook ||
                                item.analysis.rewriteBrief?.productFit ||
                                (item.analysis.rewriteBrief?.replaceableVariables ?? []).length > 0 ? (
                                  <div className="rounded-md border bg-card p-3">
                                    <div className="text-xs font-semibold text-muted-foreground">仿写 Brief</div>
                                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                      {item.analysis.rewriteBrief?.targetAudience ? <div>目标人群：{item.analysis.rewriteBrief.targetAudience}</div> : null}
                                      {item.analysis.rewriteBrief?.contentAngle ? <div>内容角度：{item.analysis.rewriteBrief.contentAngle}</div> : null}
                                      {item.analysis.rewriteBrief?.emotionHook ? <div>情绪钩子：{item.analysis.rewriteBrief.emotionHook}</div> : null}
                                      {item.analysis.rewriteBrief?.productFit ? <div>适合产品：{item.analysis.rewriteBrief.productFit}</div> : null}
                                    </div>
                                    {(item.analysis.rewriteBrief?.replaceableVariables ?? []).length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {(item.analysis.rewriteBrief?.replaceableVariables ?? []).map((variable) => (
                                          <Badge key={variable} variant="outline" className="text-[10px]">{variable}</Badge>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                {(item.analysis.riskNotes ?? []).length > 0 ? (
                                  <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-3">
                                    <div className="text-xs font-semibold text-orange-700">风险提醒</div>
                                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-orange-900">
                                      {(item.analysis.riskNotes ?? []).map((risk) => (
                                        <li key={risk}>{risk}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="mt-4 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                                尚未生成有效拆解。点击“AI拆解”后，会在这里显示标题钩子、内容结构、转化点和仿写 Brief。
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredXiaohongshuExtractions.length === 0 ? (
                        <EmptyState title="没有匹配的提取记录" description="换个关键词、标签，或者关闭只看收藏。" />
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState title="暂无提取记录" description="粘贴小红书公开链接后，图文会保存在这里。" />
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {!isBootstrapping && activeTab === "calendar" ? (
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    内容日历
                  </CardTitle>
                  <CardDescription>保留选题、形式、角度和状态，方便管理创作节奏。</CardDescription>
                </div>
                <Button
                  variant="outline"
                  disabled={calendarItems.length === 0}
                  onClick={() => downloadFile("content-calendar.csv", calendarToCsv(calendarItems), "text/csv")}
                >
                  <Download className="h-4 w-4" />
                  导出 CSV
                </Button>
              </CardHeader>
              <CardContent>
                {calendarItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-3 pr-3 font-medium">Day</th>
                          <th className="py-3 pr-3 font-medium">内容</th>
                          <th className="py-3 pr-3 font-medium">形式</th>
                          <th className="py-3 pr-3 font-medium">目标</th>
                          <th className="py-3 pr-3 font-medium">状态</th>
                          <th className="py-3 pr-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calendarItems.map((item) => (
                          <tr key={item.id} className="border-b align-top">
                            <td className="py-3 pr-3">Day {item.day}</td>
                            <td className="py-3 pr-3">
                              <div className="font-medium">{item.topic}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.angle}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.assetTitle ?? "-"}</div>
                            </td>
                            <td className="py-3 pr-3">{item.format}</td>
                            <td className="py-3 pr-3">{item.goal ?? "-"}</td>
                            <td className="py-3 pr-3">
                              <select
                                className="h-9 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={item.status}
                                onChange={(event) => updateCalendarItem(item, event.target.value)}
                              >
                                {calendarStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {statusLabels[status]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 pr-3">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteItem("calendar", item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="还没有内容日历"
                    description="先在 AI 生成里做一版 30 天内容日历，这里就会自动承接下来。"
                    action={
                      <Button onClick={() => setActiveTab("generate")}>
                        <Sparkles className="h-4 w-4" />
                        去生成日历
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : null}

          {!isBootstrapping && activeTab === "assets" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>内容资产库</CardTitle>
                    <CardDescription>管理、改写、分发你的内容资产。</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <input
                        className="bg-transparent text-sm outline-none"
                        placeholder="搜索内容或标题..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="h-9 rounded-md border bg-card px-2 text-xs outline-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">全部类型</option>
                      <option value="note">图文笔记</option>
                      <option value="video_script">视频脚本</option>
                    </select>
                    <select
                      className="h-9 rounded-md border bg-card px-2 text-xs outline-none"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">全部状态</option>
                      <option value="draft">待打磨</option>
                      <option value="ready">待发布</option>
                      <option value="published">已发布</option>
                    </select>
                    <div className="flex rounded-md border p-1">
                      <button
                        type="button"
                        className={cn("px-2 py-1 text-xs rounded", assetViewMode === "list" ? "bg-accent" : "hover:bg-accent/50")}
                        onClick={() => setAssetViewMode("list")}
                      >
                        列表
                      </button>
                      <button
                        type="button"
                        className={cn("px-2 py-1 text-xs rounded", assetViewMode === "grid" ? "bg-accent" : "hover:bg-accent/50")}
                        onClick={() => setAssetViewMode("grid")}
                      >
                        网格
                      </button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {selectedAssetIds.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-primary">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">已选择 {selectedAssetIds.length} 项资产</span>
                    <Button size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/10" onClick={() => setSelectedAssetIds([])}>
                      取消选择
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAssetIds.length === 2 && (
                      <Button size="sm" variant="default" className="h-8 bg-orange-500 hover:bg-orange-600" onClick={() => setIsComparisonOpen(true)}>
                        <Layout className="mr-1 h-3 w-3" />
                        封面 PK
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={batchGenerateCovers}>
                      <Sparkles className="mr-1 h-3 w-3" />
                      批量生图
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={batchPrePublishCheck}>
                      <Gauge className="mr-1 h-3 w-3" />
                      批量体检
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => downloadFile("batch-export.csv", assetsToCsv(assets.filter(a => selectedAssetIds.includes(a.id))), "text/csv")}>
                      <Download className="h-3 w-3" />
                      导出
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={batchDeleteAssets}>
                      <Trash2 className="h-3 w-3" />
                      批量删除
                    </Button>
                  </div>
                </div>
              )}

              <div className={cn("grid gap-4", assetViewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-1")}>
                {assetTrees.length > 0 ? (
                  assetTrees.map((root) => (
                    <AssetCard
                      key={root.id}
                      asset={root}
                      children={root.children}
                      isExpanded={expandedAssetIds.includes(root.id)}
                      onToggleExpand={() => setExpandedAssetIds(prev => prev.includes(root.id) ? prev.filter(id => id !== root.id) : [...prev, root.id])}
                      isSelected={selectedAssetIds.includes(root.id)}
                      onToggleSelect={() => setSelectedAssetIds(prev => prev.includes(root.id) ? prev.filter(id => id !== root.id) : [...prev, root.id])}
                      onPublish={setPublishAsset}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="未找到匹配的资产"
                    description="换个搜索词或者调整筛选条件试试。"
                  />
                )}
              </div>
            </div>
          ) : null}

          {!isBootstrapping && activeTab === "skills" ? (
            <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4" />
                      专家库 (Expert Toolkit)
                    </CardTitle>
                    <CardDescription>针对小红书运营的专项痛点，模拟不同领域的专家进行诊断。</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIsImportingSkill(true)}>
                    导入 Skill
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isImportingSkill && (
                    <div className="mb-4 space-y-3 rounded-lg border bg-muted/50 p-3">
                      <div className="text-xs font-bold uppercase">导入 JSON 格式</div>
                      <Textarea 
                        placeholder='{"name": "新专家", "prompt": "...", "description": "..."}' 
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        className="min-h-24 text-[10px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-[10px]" onClick={importSkill}>确认导入</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setIsImportingSkill(false)}>取消</Button>
                      </div>
                    </div>
                  )}

                  {expertSkills.map((skill) => {
                    const isActive = currentSkillId === skill.id;
                    return (
                      <div key={skill.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => setCurrentSkillId(skill.id)}
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:bg-accent",
                            isActive && "border-primary bg-primary/5"
                          )}
                        >
                          <div className="font-semibold">{skill.name}</div>
                          <div className="text-xs text-muted-foreground">{skill.description}</div>
                        </button>
                        <button 
                          className="absolute right-2 top-2 hidden group-hover:block text-destructive opacity-50 hover:opacity-100"
                          onClick={() => deleteSkill(skill.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      {expertSkills.find((s) => s.id === currentSkillId)?.name || "请选择专家"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {expertSkills.find((s) => s.id === currentSkillId)?.inputLabel || "输入内容"}
                      </label>
                      <Textarea
                        className="min-h-32"
                        placeholder={expertSkills.find((s) => s.id === currentSkillId)?.placeholder || "请先从左侧选择一个专家..."}
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={isSkillLoading || !skillInput.trim() || !currentSkillId}
                      onClick={runExpertSkill}
                    >
                      {isSkillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      开始诊断
                    </Button>
                  </CardContent>
                </Card>

                {skillSession ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-primary">诊断结果</CardTitle>
                        <span className="text-[10px] text-muted-foreground">{new Date(skillSession.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm prose-primary max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {skillSession.output}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => copyText(skillSession.output)}>
                          <Clipboard className="mr-1 h-3.5 w-3.5" />
                          复制建议
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState
                    title="等待诊断"
                    description="选择左侧专家并输入你的内容，专家会为你提供专项优化建议。"
                  />
                )}
              </div>
            </section>
          ) : null}

          {!isBootstrapping && activeTab === "settings" ? (
            <section className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4" />
                    账号人设记忆
                  </CardTitle>
                  <CardDescription>把账号定位、常用语气和边界保存下来，后续生成、标题工坊和改写会自动带上这些设定。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">账号名称</span>
                      <input
                        className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={accountProfile.accountName}
                        onChange={(event) => updateAccountProfile("accountName", event.target.value)}
                        placeholder="比如：猫咪玩具测评日记"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">账号定位</span>
                      <input
                        className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={accountProfile.positioning}
                        onChange={(event) => updateAccountProfile("positioning", event.target.value)}
                        placeholder="比如：真实养宠用品测评和陪玩灵感"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">账号核心人群</span>
                    <Textarea
                      value={accountProfile.targetAudience}
                      onChange={(event) => updateAccountProfile("targetAudience", event.target.value)}
                      placeholder="比如：新手养猫家庭、看重真实体验感的年轻养宠人群"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">固定语气</span>
                      <Textarea
                        value={accountProfile.toneStyle}
                        onChange={(event) => updateAccountProfile("toneStyle", event.target.value)}
                        placeholder="比如：像有经验的朋友在认真分享，真实、不端着"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">常用表达</span>
                      <Textarea
                        value={accountProfile.preferredPhrases}
                        onChange={(event) => updateAccountProfile("preferredPhrases", event.target.value)}
                        placeholder="比如：真心建议、这点很加分、我会更看重"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">禁用表达</span>
                      <Textarea
                        value={accountProfile.forbiddenPhrases}
                        onChange={(event) => updateAccountProfile("forbiddenPhrases", event.target.value)}
                        placeholder="比如：闭眼买、绝对安全、保证爆单"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">品牌边界</span>
                      <Textarea
                        value={accountProfile.brandBoundaries}
                        onChange={(event) => updateAccountProfile("brandBoundaries", event.target.value)}
                        placeholder="比如：不夸大功效，不承诺治疗，不说绝对化结论"
                      />
                    </label>
                  </div>

                  <Button onClick={saveAccountProfileSettings}>
                    <Settings className="h-4 w-4" />
                    保存账号人设
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    小红书图文规则
                  </CardTitle>
                  <CardDescription>每行一条规则。保存后，AI 生成、标题工坊和发布前体检都会按这里的规则执行。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">规则列表</span>
                    <Textarea
                      className="min-h-56"
                      value={contentRuleText}
                      onChange={(event) => setContentRuleText(event.target.value)}
                      placeholder="每行输入一条图文规则"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={saveContentRulesSettings}>
                      <Settings className="h-4 w-4" />
                      保存图文规则
                    </Button>
                    <Button type="button" variant="outline" onClick={resetContentRuleText}>
                      恢复默认规则
                    </Button>
                    <Badge variant="outline">{contentRules.xiaohongshuGraphicRules.length} 条生效中</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    切换模型
                  </CardTitle>
                  <CardDescription>选择供应商并保存，后续生成和改写会立即生效。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(modelConfig?.providers ?? []).map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => selectProvider(provider.id)}
                        className={cn(
                          "rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent",
                          modelForm.providerId === provider.id && "border-primary bg-accent"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{provider.name}</div>
                          {modelConfig?.activeProviderId === provider.id ? <Badge>当前</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">默认模型：{provider.defaultModel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {provider.apiStyle === "responses" ? "Responses API" : "Chat Completions"}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>模型参数</CardTitle>
                  <CardDescription>API Key 会保存到本地 `.model-config.json`，不会提交到 git。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {modelConfig ? (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{modelConfig.configured ? "已配置" : "未配置"}</Badge>
                        <Badge>{modelConfig.activeProviderName}</Badge>
                        <Badge>{modelConfig.activeModel}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">当前接口：{modelConfig.activeBaseURL}</p>
                    </div>
                  ) : null}

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">API Key</span>
                    <input
                      type="password"
                      className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={modelForm.apiKey}
                      onChange={(event) =>
                        setModelForm((current) => ({ ...current, apiKey: event.target.value }))
                      }
                      placeholder="填写当前模型供应商的 API Key"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">模型名</span>
                    <input
                      className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={modelForm.model}
                      onChange={(event) =>
                        setModelForm((current) => ({ ...current, model: event.target.value }))
                      }
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Base URL</span>
                    <input
                      className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                      value={modelForm.baseURL}
                      disabled={modelForm.providerId !== "custom"}
                      onChange={(event) =>
                        setModelForm((current) => ({ ...current, baseURL: event.target.value }))
                      }
                      placeholder="仅自定义兼容接口需要填写"
                    />
                  </label>

                  <Button onClick={saveModelSettings}>
                    <Settings className="h-4 w-4" />
                    保存并切换
                  </Button>
                </CardContent>
              </Card>
            </div>
            </section>
          ) : null}
        </section>
      </div>

      <MobileSimulator
        isOpen={!!previewNote}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title ?? ""}
        content={previewNote?.content ?? ""}
        coverText={previewNote?.coverText}
        coverImage={previewNote?.coverImage}
        coverImages={previewNote?.coverImages}
      />

      {publishAsset ? (
        <XiaohongshuPublishAssistant
          asset={publishAsset}
          onClose={() => setPublishAsset(null)}
          copyText={copyText}
          check={prePublishChecks[publishAsset.id]}
        />
      ) : null}

      {isSimulatorPinned && previewNote && (
        <div className="fixed bottom-6 right-6 z-40 hidden w-72 lg:block">
          <div className="relative rounded-3xl border-4 border-muted bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Sticky Preview</span>
              <button 
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsSimulatorPinned(false)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="aspect-[9/19] scale-[1.0] origin-top h-[450px]">
               <MobileSimulator
                  isOpen={true}
                  onClose={() => {}}
                  title={previewNote.title}
                  content={previewNote.content}
                  coverText={previewNote.coverText}
                  coverImage={previewNote.coverImage}
                  coverImages={previewNote.coverImages}
                  isSticky={true}
                />
            </div>
          </div>
        </div>
      )}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-md p-6">
          <div className="relative w-full max-w-5xl h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">封面 PK (A/B Test)</h2>
                <p className="text-muted-foreground text-sm">对比不同封面的视觉冲击力，辅助发布决策。</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsComparisonOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-12 items-center justify-center overflow-hidden px-12">
              {selectedAssetIds.slice(0, 2).map((id, index) => {
                const asset = assets.find(a => a.id === id);
                if (!asset) return null;
                return (
                  <div key={id} className="flex flex-col items-center gap-4">
                    <Badge className="bg-primary text-primary-foreground mb-2">方案 {index === 0 ? "A" : "B"}</Badge>
                    <div className="w-[320px] aspect-[9/19] scale-[0.9] origin-top border-[8px] border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
                      <MobileSimulator
                        isOpen={true}
                        onClose={() => {}}
                        title={asset.title}
                        content={asset.body}
                        coverText={asset.coverText || asset.title}
                        coverImage={asset.coverImage ? getPreviewImageUrl(asset.coverImage) : undefined}
                        coverImages={extractPreviewImages(asset)}
                        isSticky={true}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold">{asset.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {asset.coverImage ? "✅ 已配图" : "❌ 未配图"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pb-8">
              <Button size="lg" className="rounded-full px-12" onClick={() => setIsComparisonOpen(false)}>
                结束对比
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
