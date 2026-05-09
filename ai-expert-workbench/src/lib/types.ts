export type ExpertStructuredOutput = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  draftContent: string;
  cautions: string[];
};

export type CoordinatorStructuredOutput = {
  title: string;
  finalPlanMarkdown: string;
  nextActions: string[];
};

export type ExpertRunView = {
  id: string;
  roleId: string;
  roleName: string;
  status: string;
  output: ExpertStructuredOutput | null;
  error: string | null;
  createdAt: string;
};

export type TaskView = {
  id: string;
  title: string;
  userInput: string;
  selectedRoleIds: string[];
  finalSummary: string | null;
  workflowType: string;
  productId: string | null;
  createdAt: string;
  runs: ExpertRunView[];
};

export type ProductView = {
  id: string;
  name: string;
  category: string;
  targetPet: string;
  price: string | null;
  costPrice: string | null;
  salePrice: string | null;
  stock: string | null;
  shippingTime: string | null;
  material: string | null;
  size: string | null;
  sellingPoints: string;
  mainSellingPoint: string | null;
  targetAudience: string | null;
  painPoints: string | null;
  forbiddenWords: string | null;
  competitorPrice: string | null;
  differentiation: string | null;
  suitableForAds: string | null;
  suitableForKoc: string | null;
  cautions: string | null;
  scenes: string | null;
  emotionalValue: string | null;
  userPersona: string | null;
  createdAt: string;
};

export type ContentAssetView = {
  id: string;
  productId: string | null;
  productName: string | null;
  type: string;
  title: string;
  body: string;
  tags: string | null;
  source: string;
  createdAt: string;
};

export type CalendarItemView = {
  id: string;
  productId: string | null;
  productName: string | null;
  day: number;
  topic: string;
  format: string;
  angle: string;
  assetTitle: string | null;
  goal: string | null;
  publishAt: string | null;
  noteUrl: string | null;
  metrics: string | null;
  reviewNote: string | null;
  status: string;
  createdAt: string;
};

export type WorkflowType =
  | "thirty_notes"
  | "content_calendar"
  | "video_scripts"
  | "support_scripts"
  | "competitor_analysis"
  | "data_review"
  | "product_scoring"
  | "product_page"
  | "comment_ops"
  | "viral_reuse"
  | "seo_keywords"
  | "ad_strategy";

export type GeneratedNote = {
  title: string;
  coverText: string;
  body: string;
  tags: string[];
  shootingSuggestion: string;
  targetAudience: string;
  riskTip: string;
};

export type CalendarPlanItem = {
  day: number;
  topic: string;
  format: string;
  angle: string;
  assetTitle: string;
  goal?: string;
};

export type WorkflowOutput = {
  summary: string;
  notes: GeneratedNote[];
  calendar: CalendarPlanItem[];
  scripts: Array<{
    title: string;
    hook: string;
    shots: string[];
    voiceover: string;
    ending: string;
  }>;
  supportReplies: Array<{
    scenario: string;
    reply: string;
  }>;
  analysisMarkdown: string;
  nextActions: string[];
};

export type CompetitorAnalysisView = {
  id: string;
  title: string;
  competitorName: string | null;
  price: string | null;
  noteText: string;
  sellingPoints: string | null;
  userQuestions: string | null;
  weakness: string | null;
  opportunities: string | null;
  coverAnalysis: string | null;
  hotComments: string | null;
  result: string;
  createdAt: string;
};

export type DataReviewView = {
  id: string;
  title: string;
  metrics: string;
  result: string;
  createdAt: string;
};
