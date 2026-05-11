export type ContentAssetMeta = {
  visualSuggestion?: string;
  shootingSuggestion?: string;
  firstCommentVariants?: string[];
  interactionScripts?: InteractionScript[];
  targetAudience?: string;
  riskTip?: string;
  evidenceScene?: string;
  concreteDetail?: string;
  mildDrawback?: string;
  fitBoundary?: string;
  interactionQuestion?: string;
};

export type ContentAssetView = {
  id: string;
  type: string;
  title: string;
  body: string;
  tags: string | null;
  source: string;
  parentId: string | null;
  variantType: string | null;
  status: string;
  isFavorite: boolean;
  coverImage: string | null;
  coverText: string | null;
  meta: ContentAssetMeta;
  createdAt: string;
};

export type XiaohongshuExtractionView = {
  id: string;
  title: string;
  text: string;
  topics: string[];
  images: string[];
  analysis: XiaohongshuAnalysisOutput | null;
  tags: string | null;
  isFavorite: boolean;
  sourceUrl: string;
  finalUrl: string;
  createdAt: string;
};

export type XiaohongshuStructureItem = {
  section: string;
  purpose: string;
  originalSignal: string;
  reusableMove: string;
};

export type XiaohongshuRewriteBrief = {
  targetAudience: string;
  contentAngle: string;
  emotionHook: string;
  productFit: string;
  replaceableVariables: string[];
  forbiddenRisks: string[];
};

export type XiaohongshuAnalysisOutput = {
  summary: string;
  hookType: string;
  titleAnalysis: string;
  openingAnalysis: string;
  contentStructure: XiaohongshuStructureItem[];
  sellingPoints: string[];
  emotionTriggers: string[];
  interactionHooks: string[];
  visualNotes: string[];
  riskNotes: string[];
  reusableFormula: string;
  rewriteBrief: XiaohongshuRewriteBrief;
};

export type ExpertSkill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  placeholder: string;
  inputLabel: string;
};

export type ExpertSession = {
  skillId: string;
  input: string;
  output: string;
  timestamp: string;
};

export type CalendarItemView = {
  id: string;
  day: number;
  topic: string;
  format: string;
  angle: string;
  assetTitle: string | null;
  goal: string | null;
  status: string;
  createdAt: string;
};

export type WorkflowType = "thirty_notes" | "content_calendar" | "video_scripts" | "inspiration_rewrite";

export type InteractionScript = {
  scenario: string;
  userQuery: string;
  aiReply: string;
};

export type GeneratedNote = {
  title: string;
  coverText: string;
  visualSuggestion: string;
  body: string;
  tags: string[];
  shootingSuggestion: string;
  firstCommentVariants: string[];
  interactionScripts: InteractionScript[];
  targetAudience: string;
  riskTip: string;
  evidenceScene: string;
  concreteDetail: string;
  mildDrawback: string;
  fitBoundary: string;
  interactionQuestion: string;
};

export type CalendarPlanItem = {
  day: number;
  topic: string;
  format: string;
  angle: string;
  assetTitle: string;
  goal?: string;
};

export type VideoScript = {
  title: string;
  hook: string;
  shots: string[];
  voiceover: string;
  ending: string;
  interactionHook: string;
};

export type WorkflowOutput = {
  summary: string;
  notes: GeneratedNote[];
  calendar: CalendarPlanItem[];
  scripts: VideoScript[];
  nextActions: string[];
};

export type RewriteMode =
  | "more_conversational"
  | "shorter"
  | "more_saveworthy"
  | "video_voiceover";

export type StructuredBrief = {
  topic: string;
  productName: string;
  productCategory: string;
  priceRange: string;
  targetAudience: string;
  accountStage: string;
  contentForm: string;
  coreSellingPoint: string;
  userPainPoint: string;
  competitorDifference: string;
  proofPoints: string;
  useScene: string;
  emotionOrPainPoint: string;
  mustMention: string;
  toneStyle: string;
  forbiddenWords: string;
  additionalNotes: string;
};

export type TitleStyle =
  | "emotional"
  | "list"
  | "warning"
  | "contrast"
  | "experience";

export type TitleIdea = {
  text: string;
  style: TitleStyle;
  intent: string;
  scoreHint: string;
};

export type TitleWorkshopOutput = {
  summary: string;
  titles: TitleIdea[];
};

export type PrePublishCheckItem = {
  name: string;
  status: "good" | "watch" | "fix";
  advice: string;
};

export type PrePublishCheckOutput = {
  overallSuggestion: string;
  checks: PrePublishCheckItem[];
  optimizedContent?: {
    title?: string;
    body?: string;
  };
};

export type AccountProfile = {
  accountName: string;
  positioning: string;
  targetAudience: string;
  toneStyle: string;
  preferredPhrases: string;
  forbiddenPhrases: string;
  brandBoundaries: string;
};

export type ContentRulesConfig = {
  xiaohongshuGraphicRules: string[];
};
