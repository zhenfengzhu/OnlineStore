"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clipboard,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  Settings,
  PackagePlus,
  Search,
  Sparkles
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
import { TASK_TEMPLATES } from "@/lib/public-config";
import type {
  CalendarItemView,
  CompetitorAnalysisView,
  ContentAssetView,
  DataReviewView,
  ProductView,
  WorkflowOutput,
  WorkflowType
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "products" | "generate" | "calendar" | "assets" | "analysis" | "settings";

type NavItem = {
  id: TabKey;
  label: string;
  description: string;
  icon: typeof PackagePlus;
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

const workflowOptions: Array<{ id: WorkflowType; label: string; description: string }> = [
  {
    id: "thirty_notes",
    label: "30 篇笔记",
    description: "标题、封面、正文、标签、拍摄建议"
  },
  {
    id: "content_calendar",
    label: "30 天日历",
    description: "每天选题、内容形式、主推角度"
  },
  {
    id: "video_scripts",
    label: "短视频脚本",
    description: "钩子、镜头、口播、结尾引导"
  },
  {
    id: "support_scripts",
    label: "客服话术",
    description: "售前、售后、材质、尺寸、退换货"
  },
  {
    id: "competitor_analysis",
    label: "竞品拆解",
    description: "拆标题、卖点、痛点和可借鉴方向"
  },
  {
    id: "data_review",
    label: "数据复盘",
    description: "定位问题，规划下一篇优化动作"
  },
  {
    id: "product_scoring",
    label: "选品评分",
    description: "判断是否值得主推和风险点"
  },
  {
    id: "product_page",
    label: "商品页优化",
    description: "标题、主图、详情页、FAQ"
  },
  {
    id: "comment_ops",
    label: "评论区运营",
    description: "置顶评论、回复话术、二次种草"
  },
  {
    id: "viral_reuse",
    label: "爆款复用",
    description: "变体选题、A/B 标题、追发计划"
  }
];

const defaultProduct = {
  name: "",
  category: "宠物玩具",
  targetPet: "猫狗通用",
  price: "",
  costPrice: "",
  salePrice: "",
  stock: "",
  shippingTime: "",
  material: "",
  size: "",
  sellingPoints: "",
  mainSellingPoint: "",
  targetAudience: "",
  painPoints: "",
  forbiddenWords: "",
  competitorPrice: "",
  differentiation: "",
  suitableForAds: "",
  suitableForKoc: "",
  cautions: "",
  scenes: ""
};

type ProductFormState = typeof defaultProduct;

const workflowDefaults: Record<WorkflowType, string> = {
  thirty_notes: "请基于这个产品生成 30 篇小红书笔记，适合宠物玩具新店连续发布。",
  content_calendar: "请为这个产品生成 30 天小红书内容日历，覆盖图文、短视频、测评、避坑和清单。",
  video_scripts: "请为这个产品生成 8 条小红书短视频脚本，适合手机拍摄。",
  support_scripts: "请为这个产品生成客服话术，覆盖售前、售后和常见异议。",
  competitor_analysis: "请拆解下面这篇竞品小红书笔记，输出可借鉴方向，但不要搬运：\n\n",
  data_review:
    "请复盘这篇小红书笔记数据，并给出下一轮优化方案：\n曝光：\n点赞：\n收藏：\n评论：\n进店：\n成交：\n笔记标题：",
  product_scoring: "请基于产品作战卡做选品评分，判断是否值得作为主推款。",
  product_page: "请优化这个产品的小红书店铺商品页，包括商品标题、主图卖点、详情页结构和 FAQ。",
  comment_ops: "请为这个产品设计评论区运营方案，包括置顶评论、用户质疑回复和问链接回复。",
  viral_reuse:
    "请把这条表现好的内容复用放大，请粘贴原笔记内容和数据：\n标题：\n正文：\n曝光：\n点赞：\n收藏：\n评论：\n进店：\n成交："
};

const contentGoals = ["拉新曝光", "种草收藏", "评论互动", "引导进店", "促成下单", "老客复购", "清库存"];
const calendarStatuses = ["planned", "shooting", "editing", "ready", "published", "reviewed", "rewrite", "scale"];
const statusLabels: Record<string, string> = {
  planned: "待规划",
  shooting: "待拍摄",
  editing: "待剪辑",
  ready: "待发布",
  published: "已发布",
  reviewed: "已复盘",
  rewrite: "需重写",
  scale: "可放大"
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
    ["类型", "标题", "产品", "标签", "来源", "创建时间", "正文"].map(csvCell).join(","),
    ...assets.map((asset) =>
      [
        asset.type,
        asset.title,
        asset.productName,
        asset.tags,
        asset.source,
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
    ["天数", "产品", "目标", "选题", "形式", "角度", "关联资产", "状态", "发布时间", "笔记链接", "数据", "复盘"].map(csvCell).join(","),
    ...items.map((item) =>
      [
        item.day,
        item.productName,
        item.goal,
        item.topic,
        item.format,
        item.angle,
        item.assetTitle,
        statusLabels[item.status] ?? item.status,
        item.publishAt,
        item.noteUrl,
        item.metrics,
        item.reviewNote
      ]
        .map(csvCell)
        .join(",")
    )
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

function productToForm(product: ProductView): ProductFormState {
  return {
    name: product.name,
    category: product.category,
    targetPet: product.targetPet,
    price: product.price ?? "",
    costPrice: product.costPrice ?? "",
    salePrice: product.salePrice ?? "",
    stock: product.stock ?? "",
    shippingTime: product.shippingTime ?? "",
    material: product.material ?? "",
    size: product.size ?? "",
    sellingPoints: product.sellingPoints,
    mainSellingPoint: product.mainSellingPoint ?? "",
    targetAudience: product.targetAudience ?? "",
    painPoints: product.painPoints ?? "",
    forbiddenWords: product.forbiddenWords ?? "",
    competitorPrice: product.competitorPrice ?? "",
    differentiation: product.differentiation ?? "",
    suitableForAds: product.suitableForAds ?? "",
    suitableForKoc: product.suitableForKoc ?? "",
    cautions: product.cautions ?? "",
    scenes: product.scenes ?? ""
  };
}

function ProductBattleCardForm({
  value,
  onChange
}: {
  value: ProductFormState;
  onChange: (field: keyof ProductFormState, value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["name", "产品名"],
          ["category", "类目"],
          ["targetPet", "适合对象"],
          ["price", "展示价格"],
          ["costPrice", "成本价"],
          ["salePrice", "建议售价"],
          ["stock", "库存"],
          ["shippingTime", "发货周期"],
          ["material", "材质"],
          ["size", "尺寸"]
        ].map(([field, label]) => (
          <label key={field} className="space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            <input
              className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={value[field as keyof ProductFormState]}
              onChange={(event) => onChange(field as keyof ProductFormState, event.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">是否适合投流</span>
          <select
            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={value.suitableForAds}
            onChange={(event) => onChange("suitableForAds", event.target.value)}
          >
            <option value="">未判断</option>
            <option value="适合">适合</option>
            <option value="谨慎">谨慎</option>
            <option value="不适合">不适合</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">是否适合达人合作</span>
          <select
            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={value.suitableForKoc}
            onChange={(event) => onChange("suitableForKoc", event.target.value)}
          >
            <option value="">未判断</option>
            <option value="适合">适合</option>
            <option value="谨慎">谨慎</option>
            <option value="不适合">不适合</option>
          </select>
        </label>
      </div>
      {[
        ["sellingPoints", "核心卖点", "例如：耐咬、可互动、适合消耗精力、颜色出片、容易清洁"],
        ["mainSellingPoint", "主推卖点", "一句话说明最应该反复打的卖点"],
        ["targetAudience", "目标人群", "例如：新手养猫人、上班族养狗人、精力旺盛幼犬家庭"],
        ["painPoints", "用户痛点", "例如：宠物无聊拆家、玩具很快玩腻、担心材质和清洁"],
        ["forbiddenWords", "禁止宣传词", "例如：绝对安全、永远咬不坏、治愈焦虑、保证爆单"],
        ["cautions", "注意事项", "例如：小型犬选择小号，玩耍时建议主人看护，定期清洁"],
        ["scenes", "适合拍摄场景", "例如：客厅互动、饭前消耗精力、上班族回家陪玩、猫咪追逐"]
      ].map(([field, label, placeholder]) => (
        <label key={field} className="space-y-1 text-sm">
          <span className="font-medium">{label}</span>
          <Textarea
            value={value[field as keyof ProductFormState]}
            onChange={(event) => onChange(field as keyof ProductFormState, event.target.value)}
            placeholder={placeholder}
          />
        </label>
      ))}
      <label className="space-y-1 text-sm">
        <span className="font-medium">竞品价格与差异化</span>
        <Textarea
          value={`${value.competitorPrice}${value.differentiation ? `\n${value.differentiation}` : ""}`}
          onChange={(event) => {
            const [competitorPrice = "", ...rest] = event.target.value.split("\n");
            onChange("competitorPrice", competitorPrice);
            onChange("differentiation", rest.join("\n"));
          }}
          placeholder="第一行写竞品价格；后面写我方差异点"
        />
      </label>
    </>
  );
}

export function Workbench() {
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [products, setProducts] = useState<ProductView[]>([]);
  const [assets, setAssets] = useState<ContentAssetView[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemView[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorAnalysisView[]>([]);
  const [reviews, setReviews] = useState<DataReviewView[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [workflowType, setWorkflowType] = useState<WorkflowType>("thirty_notes");
  const [workflowInput, setWorkflowInput] = useState(workflowDefaults.thirty_notes);
  const [contentGoal, setContentGoal] = useState(contentGoals[1]);
  const [productForm, setProductForm] = useState(defaultProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductForm, setEditingProductForm] = useState(defaultProduct);
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

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  async function loadAll() {
    setIsBootstrapping(true);
    setError(null);
    try {
      const [productsRes, assetsRes, calendarRes, competitorsRes, reviewsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/assets"),
        fetch("/api/calendar"),
        fetch("/api/competitors"),
        fetch("/api/reviews")
      ]);
      const [productsData, assetsData, calendarData, competitorsData, reviewsData] =
        await Promise.all([
          productsRes.json(),
          assetsRes.json(),
          calendarRes.json(),
          competitorsRes.json(),
          reviewsRes.json()
        ]);

      if (!productsRes.ok) throw new Error(productsData.error ?? "产品加载失败。");
      if (!assetsRes.ok) throw new Error(assetsData.error ?? "资产加载失败。");
      if (!calendarRes.ok) throw new Error(calendarData.error ?? "日历加载失败。");
      if (!competitorsRes.ok) throw new Error(competitorsData.error ?? "竞品记录加载失败。");
      if (!reviewsRes.ok) throw new Error(reviewsData.error ?? "复盘记录加载失败。");

      const loadedProducts = (productsData.products ?? []) as ProductView[];
      setProducts(loadedProducts);
      setAssets((assetsData.assets ?? []) as ContentAssetView[]);
      setCalendarItems((calendarData.items ?? []) as CalendarItemView[]);
      setCompetitors((competitorsData.analyses ?? []) as CompetitorAnalysisView[]);
      setReviews((reviewsData.reviews ?? []) as DataReviewView[]);

      if (!selectedProductId && loadedProducts[0]) {
        setSelectedProductId(loadedProducts[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "数据加载失败。");
    } finally {
      setIsBootstrapping(false);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadModelConfig();
  }, []);

  async function loadModelConfig() {
    try {
      const response = await fetch("/api/model-config");
      const data = (await response.json()) as ModelConfigView;
      if (response.ok) {
        setModelConfig(data);
        const activeProvider = data.providers.find((provider) => provider.id === data.activeProviderId);
        setModelForm((current) => ({
          ...current,
          providerId: data.activeProviderId,
          model: data.activeModel || activeProvider?.defaultModel || current.model,
          baseURL: data.activeBaseURL || ""
        }));
      }
    } catch {
      setModelConfig(null);
    }
  }

  function updateProductField(field: keyof typeof defaultProduct, value: string) {
    setProductForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateEditingProductField(field: keyof ProductFormState, value: string) {
    setEditingProductForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function createProduct() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm)
      });
      const data = (await response.json()) as { product?: ProductView; error?: string };

      if (!response.ok || !data.product) {
        throw new Error(data.error ?? "产品保存失败。");
      }

      setProducts((current) => [data.product as ProductView, ...current]);
      setSelectedProductId(data.product.id);
      setProductForm(defaultProduct);
      setMessage("产品资料已保存。");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "产品保存失败。");
    }
  }

  function startEditingProduct(product: ProductView) {
    setEditingProductId(product.id);
    setEditingProductForm(productToForm(product));
    setSelectedProductId(product.id);
  }

  async function saveProductEdit() {
    if (!editingProductId) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProductId,
          ...editingProductForm
        })
      });
      const data = (await response.json()) as { product?: ProductView; error?: string };

      if (!response.ok || !data.product) {
        throw new Error(data.error ?? "产品更新失败。");
      }

      setProducts((current) =>
        current.map((product) => (product.id === data.product?.id ? data.product : product))
      );
      setSelectedProductId(data.product.id);
      setEditingProductId(null);
      setMessage("产品作战卡已更新。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "产品更新失败。");
    }
  }

  function selectWorkflow(type: WorkflowType) {
    setWorkflowType(type);
    setWorkflowInput(workflowDefaults[type]);
    setLastOutput(null);
  }

  async function runCommercialWorkflow() {
    setError(null);
    setMessage(null);
    setLastOutput(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: workflowType,
          productId: selectedProductId || undefined,
          userInput: `内容目标：${contentGoal}\n\n${workflowInput}`
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
      setActiveTab(workflowType === "content_calendar" || workflowType === "data_review" ? "calendar" : "assets");
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "生成失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("已复制到剪贴板。");
  }

  async function updateCalendarItem(
    item: CalendarItemView,
    patch: Partial<Pick<CalendarItemView, "status" | "publishAt" | "noteUrl" | "metrics" | "reviewNote">>
  ) {
    setError(null);
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...patch })
      });
      const data = (await response.json()) as { item?: CalendarItemView; error?: string };
      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "日历更新失败。");
      }
      setCalendarItems((current) =>
        current.map((calendarItem) => (calendarItem.id === data.item?.id ? data.item : calendarItem))
      );
      setMessage("日历条目已更新。");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "日历更新失败。");
    }
  }

  function selectProvider(providerId: string) {
    const provider = modelConfig?.providers.find((item) => item.id === providerId);
    setModelForm((current) => ({
      ...current,
      providerId,
      model: provider?.defaultModel ?? current.model,
      baseURL:
        provider?.baseURL && provider.baseURL !== "CUSTOM_MODEL_BASE_URL" ? provider.baseURL : current.baseURL
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
        throw new Error(data.error ?? "模型设置保存失败。");
      }

      setModelConfig(data);
      setMessage(`已切换到 ${data.activeProviderName} / ${data.activeModel}。`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "模型设置保存失败。");
    }
  }

  const tabs: NavItem[] = [
    { id: "products", label: "产品库", description: "维护商品资料", icon: PackagePlus },
    { id: "generate", label: "AI 生成", description: "创建内容资产", icon: Sparkles },
    { id: "calendar", label: "内容日历", description: "查看发布排期", icon: CalendarDays },
    { id: "assets", label: "资产库", description: "复制与导出内容", icon: FolderOpen },
    { id: "analysis", label: "竞品/复盘", description: "沉淀分析记录", icon: BarChart3 },
    { id: "settings", label: "模型设置", description: "切换模型供应商", icon: Settings }
  ];

  const activeNav = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveIcon = activeNav.icon;

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="flex h-full flex-col rounded-lg border bg-card shadow-sm">
            <div className="border-b p-5">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden />
                <Badge>商业实用版 V1</Badge>
              </div>
              <h1 className="mt-3 text-lg font-semibold">小红书电商 AI 运营工作台</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                产品资料、内容生成、日历排期和资产沉淀一体化。
              </p>
            </div>

            <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:overflow-visible">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex min-w-40 items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent lg:min-w-0",
                      activeTab === tab.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-medium">{tab.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{tab.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t p-4">
              <div className="space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">当前模型</div>
                <div>
                  {modelConfig
                    ? `${modelConfig.activeProviderName} / ${modelConfig.activeModel}`
                    : "读取中"}
                </div>
                {modelConfig && !modelConfig.configured ? (
                  <button
                    type="button"
                    className="mt-2 text-primary underline-offset-4 hover:underline"
                    onClick={() => setActiveTab("settings")}
                  >
                    去配置模型
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-5">
          <header className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ActiveIcon className="h-4 w-4" aria-hidden />
                  {activeNav.label}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">{activeNav.description}</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  建议流程：先配置模型，再添加产品资料，随后生成内容，最后在日历和资产库中复用。
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  className="h-10 min-w-56 rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  <option value="">未选择产品</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={loadAll} disabled={isBootstrapping}>
                  {isBootstrapping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  刷新
                </Button>
                <Button onClick={() => setActiveTab("generate")}>
                  <Sparkles className="h-4 w-4" />
                  生成内容
                </Button>
              </div>
            </div>
          </header>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-primary/30 bg-accent px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="产品资料" value={products.length} />
        <Stat label="内容资产" value={assets.length} />
        <Stat label="日历条目" value={calendarItems.length} />
        <Stat label="分析记录" value={competitors.length + reviews.length} />
      </section>

      {activeTab === "products" ? (
        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="h-4 w-4" />
                新增产品资料
              </CardTitle>
              <CardDescription>后续所有生成都会优先读取这里的产品信息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductBattleCardForm value={productForm} onChange={updateProductField} />
              <Button onClick={createProduct}>
                <PackagePlus className="h-4 w-4" />
                保存产品
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>产品资料库</CardTitle>
              <CardDescription>选择一个产品后，AI 生成会自动带入产品信息。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.length === 0 ? (
                <EmptyState
                  title="还没有产品资料"
                  description="先录入一个宠物玩具，后续生成笔记、脚本和日历时会自动带入卖点。"
                />
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "rounded-lg border bg-card p-4",
                      selectedProductId === product.id && "border-primary bg-accent/50"
                    )}
                  >
                    {editingProductId === product.id ? (
                      <div className="space-y-4">
                        <ProductBattleCardForm
                          value={editingProductForm}
                          onChange={updateEditingProductField}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={saveProductEdit}>保存修改</Button>
                          <Button variant="outline" onClick={() => setEditingProductId(null)}>
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{product.name}</h3>
                          <Badge>{product.targetPet}</Badge>
                          <Badge>{product.category}</Badge>
                          {selectedProductId === product.id ? <Badge>当前产品</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{product.sellingPoints}</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {product.salePrice || product.price
                            ? `售价：${product.salePrice ?? product.price}  `
                            : ""}
                          {product.costPrice ? `成本：${product.costPrice}  ` : ""}
                          {product.stock ? `库存：${product.stock}  ` : ""}
                          {product.material ? `材质：${product.material}  ` : ""}
                          {product.size ? `尺寸：${product.size}` : ""}
                        </div>
                        {product.mainSellingPoint || product.painPoints ? (
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            {product.mainSellingPoint ? <div>主推：{product.mainSellingPoint}</div> : null}
                            {product.painPoints ? <div>痛点：{product.painPoints}</div> : null}
                          </div>
                        ) : null}
                      </button>
                    )}
                    {editingProductId !== product.id ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingProduct(product)}>
                          编辑作战卡
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setActiveTab("generate");
                          }}
                        >
                          用它生成
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "generate" ? (
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>商业工作流生成</CardTitle>
              <CardDescription>选择产品和工作流，生成结果会自动沉淀到资产库或日历。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium">产品</span>
                <select
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  <option value="">不绑定产品</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              {!selectedProductId ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  没有选择产品也能生成；选择产品后，输出会更贴合商品卖点。
                </div>
              ) : null}
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
              <div className="grid gap-2 sm:grid-cols-2">
                {workflowOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
                      workflowType === option.id && "border-primary bg-accent"
                    )}
                    onClick={() => selectWorkflow(option.id)}
                  >
                    <div className="font-medium">{option.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {TASK_TEMPLATES.slice(0, 4).map((template) => (
                  <Button
                    key={template.title}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal py-3 text-left"
                    onClick={() => setWorkflowInput(template.prompt)}
                  >
                    {template.title}
                  </Button>
                ))}
              </div>
              <Textarea value={workflowInput} onChange={(event) => setWorkflowInput(event.target.value)} />
              <Button disabled={isLoading || !workflowInput.trim()} onClick={runCommercialWorkflow}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                开始生成
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近生成结果</CardTitle>
              <CardDescription>完整内容已保存到对应模块。</CardDescription>
            </CardHeader>
            <CardContent>
              {!lastOutput ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {selectedProduct
                    ? `当前产品：${selectedProduct.name}。选择工作流后点击开始生成。`
                    : "还没有选择产品，也可以直接输入任务生成。"}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">{lastOutput.summary}</p>
                  {lastOutput.analysisMarkdown ? (
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm">
                      {lastOutput.analysisMarkdown}
                    </pre>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Stat label="笔记" value={lastOutput.notes.length} />
                    <Stat label="日历" value={lastOutput.calendar.length} />
                    <Stat label="脚本" value={lastOutput.scripts.length} />
                    <Stat label="话术" value={lastOutput.supportReplies.length} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "calendar" ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                内容发布日历
              </CardTitle>
              <CardDescription>30 天内容排期，可以导出 CSV 到表格继续编辑。</CardDescription>
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
          <CardContent className="overflow-auto">
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">天数</th>
                  <th className="py-2 pr-3">产品</th>
                  <th className="py-2 pr-3">目标</th>
                  <th className="py-2 pr-3">选题</th>
                  <th className="py-2 pr-3">形式</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 pr-3">发布时间</th>
                  <th className="py-2 pr-3">链接/数据</th>
                </tr>
              </thead>
              <tbody>
                {calendarItems.map((item) => (
                  <tr key={item.id} className="border-b align-top">
                    <td className="py-3 pr-3">Day {item.day}</td>
                    <td className="py-3 pr-3">{item.productName ?? "-"}</td>
                    <td className="py-3 pr-3">{item.goal ?? "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.topic}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.angle}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.assetTitle ?? "-"}</div>
                    </td>
                    <td className="py-3 pr-3">{item.format}</td>
                    <td className="py-3 pr-3">
                      <select
                        className="h-9 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={item.status}
                        onChange={(event) => updateCalendarItem(item, { status: event.target.value })}
                      >
                        {calendarStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <input
                        className="h-9 w-36 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={item.publishAt ?? ""}
                        placeholder="如 05-12 20:00"
                        onBlur={(event) => updateCalendarItem(item, { publishAt: event.target.value })}
                      />
                    </td>
                    <td className="space-y-2 py-3 pr-3">
                      <input
                        className="h-9 w-56 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={item.noteUrl ?? ""}
                        placeholder="笔记链接"
                        onBlur={(event) => updateCalendarItem(item, { noteUrl: event.target.value })}
                      />
                      <input
                        className="h-9 w-56 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={item.metrics ?? ""}
                        placeholder="曝光/赞/藏/评/进店/成交"
                        onBlur={(event) => updateCalendarItem(item, { metrics: event.target.value })}
                      />
                      <input
                        className="h-9 w-56 rounded-md border bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        defaultValue={item.reviewNote ?? ""}
                        placeholder="复盘结论"
                        onBlur={(event) => updateCalendarItem(item, { reviewNote: event.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calendarItems.length === 0 ? (
              <EmptyState
                title="还没有内容日历"
                description="生成 30 天内容日历后，这里会显示每日选题、形式和主推角度。"
                action={
                  <Button onClick={() => setActiveTab("generate")}>
                    <Sparkles className="h-4 w-4" />
                    去生成日历
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "assets" ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>内容资产库</CardTitle>
              <CardDescription>保存所有笔记、短视频脚本和客服话术，支持 Markdown/CSV 导出。</CardDescription>
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
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{asset.type}</Badge>
                  {asset.productName ? <Badge>{asset.productName}</Badge> : null}
                  <span className="text-xs text-muted-foreground">{formatDate(asset.createdAt)}</span>
                </div>
                <h3 className="font-semibold">{asset.title}</h3>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                  {asset.body}
                </pre>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyText(asset.body)}>
                    <Clipboard className="h-4 w-4" />
                    复制
                  </Button>
                </div>
              </div>
            ))}
            {assets.length === 0 ? (
              <EmptyState
                title="还没有内容资产"
                description="生成笔记、短视频脚本或客服话术后，这里会自动保存，可复制和导出。"
                action={
                  <Button onClick={() => setActiveTab("generate")}>
                    <Sparkles className="h-4 w-4" />
                    去生成内容
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "analysis" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                竞品笔记拆解
              </CardTitle>
              <CardDescription>在 AI 生成里选择“竞品拆解”，结果会保存到这里。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {competitors.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="mb-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                    {item.result}
                  </pre>
                </div>
              ))}
              {competitors.length === 0 ? (
                <EmptyState
                  title="还没有竞品拆解"
                  description="在 AI 生成里选择竞品拆解，粘贴对标笔记后会保存到这里。"
                  action={
                    <Button onClick={() => setActiveTab("generate")}>
                      <Search className="h-4 w-4" />
                      去拆解竞品
                    </Button>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                数据复盘记录
              </CardTitle>
              <CardDescription>在 AI 生成里选择“数据复盘”，结果会保存到这里。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="mb-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                    {item.result}
                  </pre>
                </div>
              ))}
              {reviews.length === 0 ? (
                <EmptyState
                  title="还没有数据复盘"
                  description="输入曝光、收藏、评论、进店和成交数据，系统会给出下一轮优化方向。"
                  action={
                    <Button onClick={() => setActiveTab("generate")}>
                      <BarChart3 className="h-4 w-4" />
                      去复盘数据
                    </Button>
                  }
                />
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                点击切换模型
              </CardTitle>
              <CardDescription>选择模型供应商，填写 API Key 和模型名，保存后立即生效。</CardDescription>
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
                      {provider.apiStyle === "responses" ? "Responses API" : "Chat Completions 兼容"}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>模型参数</CardTitle>
              <CardDescription>
                API Key 会保存到本地 .model-config.json，不会提交到 git。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modelConfig ? (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{modelConfig.configured ? "已配置" : "未配置"}</Badge>
                    <Badge>{modelConfig.activeProviderName}</Badge>
                    <Badge>{modelConfig.activeModel}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    当前接口：{modelConfig.activeBaseURL}
                  </p>
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
                  placeholder="粘贴当前模型供应商的 API Key"
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

              <p className="text-xs text-muted-foreground">
                保存后新生成任务会使用新模型；已生成内容不会改变。
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
        </section>
      </div>
    </main>
  );
}
