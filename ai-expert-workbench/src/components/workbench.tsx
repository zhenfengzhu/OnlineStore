"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clipboard,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Loader2,
  MessageSquareQuote,
  PanelsTopLeft,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  Video,
  WandSparkles
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
import { REWRITE_OPTIONS, TITLE_STYLE_OPTIONS, WORKFLOW_TEMPLATES } from "@/lib/public-config";
import type {
  AccountProfile,
  CalendarItemView,
  ContentAssetView,
  PrePublishCheckOutput,
  RewriteMode,
  StructuredBrief,
  TitleStyle,
  TitleWorkshopOutput,
  WorkflowOutput,
  WorkflowType
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "generate" | "calendar" | "assets" | "settings";

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
    label: "3篇笔记",
    description: "标题、封面文案、正文、标签和拍摄建议",
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
  }
];

const defaultBrief: StructuredBrief = {
  topic: "",
  targetAudience: "",
  contentForm: "图文笔记",
  coreSellingPoint: "",
  useScene: "",
  emotionOrPainPoint: "",
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

function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
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
    `目标人群：${brief.targetAudience || "未填写"}`,
    `内容形式：${brief.contentForm || "未填写"}`,
    `核心卖点：${brief.coreSellingPoint || "未填写"}`,
    `使用场景：${brief.useScene || "未填写"}`,
    `情绪/痛点：${brief.emotionOrPainPoint || "未填写"}`,
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

export function Workbench() {
  const [activeTab, setActiveTab] = useState<TabKey>("generate");
  const [assets, setAssets] = useState<ContentAssetView[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemView[]>([]);
  const [workflowType, setWorkflowType] = useState<WorkflowType>("thirty_notes");
  const [brief, setBrief] = useState<StructuredBrief>(defaultBrief);
  const [contentGoal, setContentGoal] = useState(contentGoals[1]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<WorkflowOutput | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfigView | null>(null);
  const [modelForm, setModelForm] = useState({
    providerId: "openai",
    apiKey: "",
    model: "gpt-5.2",
    baseURL: ""
  });
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(defaultAccountProfile);
  const [previewNote, setPreviewNote] = useState<{ title: string; content: string } | null>(null);
  const [rewritingAssetId, setRewritingAssetId] = useState<string | null>(null);
  const [titleWorkshop, setTitleWorkshop] = useState<TitleWorkshopOutput | null>(null);
  const [preferredTitleStyles, setPreferredTitleStyles] = useState<TitleStyle[]>(
    TITLE_STYLE_OPTIONS.map((item) => item.id)
  );
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [checkingAssetId, setCheckingAssetId] = useState<string | null>(null);
  const [prePublishChecks, setPrePublishChecks] = useState<Record<string, PrePublishCheckOutput>>({});

  async function loadAll() {
    setIsBootstrapping(true);
    setError(null);
    try {
      const [assetsRes, calendarRes] = await Promise.all([fetch("/api/assets"), fetch("/api/calendar")]);
      const [assetsData, calendarData] = await Promise.all([assetsRes.json(), calendarRes.json()]);

      if (!assetsRes.ok) throw new Error(assetsData.error ?? "内容资产加载失败。");
      if (!calendarRes.ok) throw new Error(calendarData.error ?? "内容日历加载失败。");

      setAssets((assetsData.assets ?? []) as ContentAssetView[]);
      setCalendarItems((calendarData.items ?? []) as CalendarItemView[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "数据加载失败。");
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadModelConfig();
    void loadAccountProfile();
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

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("已复制到剪贴板。");
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
          userInput: buildPrompt(contentGoal, brief, accountProfile)
        })
      });

      const data = (await response.json()) as {
        output?: WorkflowOutput;
        persistence?: { assetCount: number; calendarCount: number };
        error?: string;
      };

      if (!response.ok || !data.output) {
        throw new Error(data.error ?? "生成失败。");
      }

      setLastOutput(data.output);
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

      setTitleWorkshop(data.output);
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

  const tabs: NavItem[] = [
    { id: "generate", label: "AI生成", description: "结构化创作输入", icon: Sparkles },
    { id: "calendar", label: "内容日历", description: "查看排期与主题", icon: CalendarDays },
    { id: "assets", label: "资产库", description: "复制、预览与二改", icon: FolderOpen },
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

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent",
                      activeTab === tab.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div>
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs text-muted-foreground">{tab.description}</div>
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
                <Stat label="日历条目" value={calendarItems.length} />
                <Stat label="笔记" value={assets.filter((asset) => asset.type === "note").length} />
                <Stat label="改写版本" value={assets.filter((asset) => Boolean(asset.parentId)).length} />
              </div>
            </div>
          </header>

          {message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">{message}</div> : null}
          {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">主题</span>
                      <input
                        className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={brief.topic}
                        onChange={(event) => updateBrief("topic", event.target.value)}
                        placeholder="比如：宠物互动玩具种草"
                      />
                    </label>

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

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">核心卖点</span>
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
                        placeholder="比如：猫咪无聊拆家，不知道买什么互动玩具"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">语气风格</span>
                      <Textarea
                        value={brief.toneStyle}
                        onChange={(event) => updateBrief("toneStyle", event.target.value)}
                        placeholder="比如：像有经验的朋友在真实分享"
                      />
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium">禁用表达</span>
                      <Textarea
                        value={brief.forbiddenWords}
                        onChange={(event) => updateBrief("forbiddenWords", event.target.value)}
                        placeholder="比如：绝对安全、闭眼买、保证爆单"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium">补充说明</span>
                    <Textarea
                      className="min-h-28"
                      value={brief.additionalNotes}
                      onChange={(event) => updateBrief("additionalNotes", event.target.value)}
                      placeholder="把这次特别在意的要求补进来，比如更口语、更多清单感、适合收藏等"
                    />
                  </label>

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

                  {titleWorkshop ? (
                    <div className="space-y-4 rounded-xl border p-4">
                      <div>
                        <div className="text-sm font-medium">标题建议</div>
                        <p className="mt-1 text-sm text-muted-foreground">{titleWorkshop.summary}</p>
                      </div>

                      <div className="space-y-3">
                        {titleWorkshop.titles.map((title, index) => (
                          <div key={`${title.text}-${index}`} className="rounded-lg border bg-muted/30 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>{TITLE_STYLE_OPTIONS.find((item) => item.id === title.style)?.label ?? title.style}</Badge>
                              <Badge>{title.scoreHint}</Badge>
                            </div>
                            <div className="mt-2 text-sm font-medium">{title.text}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{title.intent}</div>
                            <div className="mt-3">
                              <Button size="sm" variant="outline" onClick={() => copyText(title.text)}>
                                <Clipboard className="h-4 w-4" />
                                复制标题
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
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
                        <Stat label="笔记" value={lastOutput.notes.length} />
                        <Stat label="日历" value={lastOutput.calendar.length} />
                        <Stat label="脚本" value={lastOutput.scripts.length} />
                        <Stat label="动作" value={lastOutput.nextActions.length} />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium">内容摘要</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{lastOutput.summary}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium">下一步建议</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {lastOutput.nextActions.map((item) => (
                            <Badge key={item}>{item}</Badge>
                          ))}
                        </div>
                      </div>

                      {lastOutput.notes[0] ? (
                        <div>
                          <h3 className="text-sm font-medium">示例笔记</h3>
                          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                            {lastOutput.notes[0].body}
                          </pre>
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
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>内容资产库</CardTitle>
                  <CardDescription>现在可以直接在资产库里做二改，并把新版本继续沉淀下来。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={assets.length === 0}
                    onClick={() => downloadFile("content-assets.md", assetsToMarkdown(assets), "text/markdown")}
                  >
                    <Download className="h-4 w-4" />
                    导出 MD
                  </Button>
                  <Button
                    variant="outline"
                    disabled={assets.length === 0}
                    onClick={() => downloadFile("content-assets.csv", assetsToCsv(assets), "text/csv")}
                  >
                    <Download className="h-4 w-4" />
                    导出 CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {assets.length > 0 ? (
                  assets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border bg-card p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge>{asset.type}</Badge>
                        <Badge>{asset.source}</Badge>
                        {asset.variantType ? <Badge>{asset.variantType}</Badge> : null}
                        {asset.parentId ? <Badge>改写版</Badge> : null}
                        <span className="text-xs text-muted-foreground">{formatDate(asset.createdAt)}</span>
                      </div>

                      <h3 className="font-semibold">{asset.title}</h3>
                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                        {asset.body}
                      </pre>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyText(asset.body)}>
                          <Clipboard className="h-4 w-4" />
                          复制
                        </Button>
                        {asset.type === "note" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewNote({ title: asset.title, content: asset.body })}
                          >
                            <Smartphone className="h-4 w-4" />
                            预览
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={checkingAssetId === asset.id}
                          onClick={() => runPrePublishCheck(asset)}
                        >
                          {checkingAssetId === asset.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Gauge className="h-4 w-4" />
                          )}
                          发布前检查
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteItem("assets", asset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {REWRITE_OPTIONS.map((option) => (
                          <Button
                            key={`${asset.id}-${option.mode}`}
                            size="sm"
                            variant="secondary"
                            disabled={rewritingAssetId === asset.id}
                            onClick={() => rewriteAsset(asset, option.mode)}
                          >
                            {rewritingAssetId === asset.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <WandSparkles className="h-4 w-4" />
                            )}
                            {option.label}
                          </Button>
                        ))}
                      </div>

                      {prePublishChecks[asset.id] ? (
                        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            <div className="text-sm font-medium">发布前检查</div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {prePublishChecks[asset.id]?.overallSuggestion}
                          </p>
                          <div className="mt-3 space-y-2">
                            {prePublishChecks[asset.id]?.checks.map((check) => (
                              <div key={`${asset.id}-${check.name}`} className="rounded-md border bg-card p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge>{check.name}</Badge>
                                  <Badge
                                    className={cn(
                                      check.status === "good" && "border-emerald-500/40 text-emerald-700",
                                      check.status === "watch" && "border-amber-500/40 text-amber-700",
                                      check.status === "fix" && "border-red-500/40 text-red-700"
                                    )}
                                  >
                                    {check.status === "good"
                                      ? "良好"
                                      : check.status === "watch"
                                        ? "可优化"
                                        : "建议修改"}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{check.advice}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="还没有内容资产"
                    description="生成笔记或短视频脚本后，这里会自动保存下来，而且可以继续二次改写。"
                    action={
                      <Button onClick={() => setActiveTab("generate")}>
                        <Sparkles className="h-4 w-4" />
                        去生成内容
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
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
      />
    </main>
  );
}
