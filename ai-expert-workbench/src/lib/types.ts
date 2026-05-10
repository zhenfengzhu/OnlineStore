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
  createdAt: string;
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

export type WorkflowType = "thirty_notes" | "content_calendar" | "video_scripts";

export type GeneratedNote = {
  title: string;
  coverText: string;
  visualSuggestion: string;
  body: string;
  tags: string[];
  shootingSuggestion: string;
  firstComment: string;
  engagementTrigger: string;
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
  targetAudience: string;
  contentForm: string;
  coreSellingPoint: string;
  useScene: string;
  emotionOrPainPoint: string;
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
