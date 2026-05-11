import type { RewriteMode, StructuredBrief, TitleStyle, WorkflowType } from "@/lib/types";

export const WORKFLOW_TEMPLATES: Array<{
  title: string;
  workflowType: WorkflowType;
  brief: StructuredBrief;
}> = [
  {
    title: "宠物图文种草",
    workflowType: "thirty_notes",
    brief: {
      topic: "宠物互动玩具种草",
      productName: "猫咪互动玩具",
      productCategory: "宠物玩具",
      priceRange: "中端，适合日常陪玩",
      targetAudience: "新手养猫家庭",
      accountStage: "种草转化期，需要建立真实体验信任",
      contentForm: "图文笔记",
      coreSellingPoint: "耐咬、互动性强、拍出来有氛围",
      userPainPoint: "玩具买回来猫不爱玩、拍照不好看、很快被咬坏",
      competitorDifference: "比普通逗猫棒更适合独立玩，也更适合拍照出片",
      proofPoints: "下班回家陪玩 15 分钟，周末自然光下拍细节，用一段时间后观察耐咬表现",
      useScene: "下班回家陪玩、周末在家消耗精力",
      emotionOrPainPoint: "担心猫咪无聊拆家，想找真实好拍的互动玩具",
      mustMention: "适合爱拍照的新手铲屎官，说明一个轻微缺点或适用边界",
      toneStyle: "像有经验的养宠朋友在真心推荐，口语化但不过分夸张",
      forbiddenWords: "绝对安全、包治分离焦虑、永远咬不坏",
      additionalNotes: "重点强化真实体验感和画面感"
    }
  },
  {
    title: "30天内容规划",
    workflowType: "content_calendar",
    brief: {
      topic: "宠物玩具内容规划",
      productName: "宠物互动玩具",
      productCategory: "宠物用品",
      priceRange: "覆盖入门到中端",
      targetAudience: "城市养宠家庭",
      accountStage: "内容增长期，需要稳定输出选题",
      contentForm: "30天内容日历",
      coreSellingPoint: "互动性、颜值、陪伴感、消耗精力",
      userPainPoint: "选题重复、内容缺少场景证据、用户看完不想收藏",
      competitorDifference: "比单纯产品种草更强调真实陪玩场景和复盘",
      proofPoints: "围绕居家陪玩、拍照、测评、避坑、清单拆分内容证据",
      useScene: "居家互动、单宠陪伴、多人围观拍摄",
      emotionOrPainPoint: "创作选题容易重复，想持续稳定产出内容",
      mustMention: "每周要覆盖不同内容目的，避免 30 天重复种草",
      toneStyle: "更像成熟账号的月度排期，节奏清晰，选题不重复",
      forbiddenWords: "保证爆单、一定涨粉",
      additionalNotes: "覆盖图文、视频、测评、避坑、清单和场景内容"
    }
  },
  {
    title: "短视频脚本",
    workflowType: "video_scripts",
    brief: {
      topic: "宠物玩具短视频",
      productName: "宠物互动玩具",
      productCategory: "宠物短视频素材",
      priceRange: "低成本可拍",
      targetAudience: "年轻养宠人群",
      accountStage: "涨粉互动期，需要提升完播和评论",
      contentForm: "短视频脚本",
      coreSellingPoint: "互动好拍、节奏快、能看出宠物真实反应",
      userPainPoint: "不会设计开头钩子，拍出来像流水账",
      competitorDifference: "比普通口播更强调镜头动作和宠物即时反应",
      proofPoints: "自然光、手机竖屏、猫咪扑咬/观察/互动的真实镜头",
      useScene: "手机竖屏拍摄、家庭自然光、单人执行",
      emotionOrPainPoint: "不会设计开头钩子，也不会拆镜头",
      mustMention: "开头 3 秒必须有反应镜头或反差钩子",
      toneStyle: "节奏干脆，适合边拍边念，镜头说明要简单直接",
      forbiddenWords: "百分百爆款、闭眼买",
      additionalNotes: "每条都要适合低成本拍摄"
    }
  }
];

export const REWRITE_OPTIONS: Array<{
  mode: RewriteMode;
  label: string;
}> = [
  { mode: "more_conversational", label: "改口语" },
  { mode: "shorter", label: "改短一点" },
  { mode: "more_saveworthy", label: "更适合收藏" },
  { mode: "video_voiceover", label: "改成口播版" }
];

export const TITLE_STYLE_OPTIONS: Array<{
  id: TitleStyle;
  label: string;
}> = [
  { id: "emotional", label: "情绪型" },
  { id: "list", label: "清单型" },
  { id: "warning", label: "避坑型" },
  { id: "contrast", label: "反差型" },
  { id: "experience", label: "经验型" }
];
