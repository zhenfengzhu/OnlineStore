export type PublicExpertRole = {
  id: string;
  name: string;
  description: string;
  selectable: boolean;
};

export const ROLE_META: PublicExpertRole[] = [
  {
    id: "product",
    name: "选品专家",
    description: "分析宠物玩具卖点、用户痛点、价格带和差异化。",
    selectable: true
  },
  {
    id: "ops",
    name: "小红书运营专家",
    description: "设计账号定位、选题方向、发布节奏和互动策略。",
    selectable: true
  },
  {
    id: "copywriter",
    name: "爆款文案专家",
    description: "生成标题、封面文案、正文结构和种草表达。",
    selectable: true
  },
  {
    id: "video",
    name: "短视频脚本专家",
    description: "拆解镜头、口播、场景和拍摄执行清单。",
    selectable: true
  },
  {
    id: "analytics",
    name: "数据复盘专家",
    description: "根据曝光、互动和成交数据给出优化动作。",
    selectable: true
  },
  {
    id: "support",
    name: "客服话术专家",
    description: "生成售前咨询、售后解释和常见问题回复。",
    selectable: true
  },
  {
    id: "coordinator",
    name: "总控汇总专家",
    description: "整合多位专家建议，输出最终可执行方案。",
    selectable: false
  }
];

export const DEFAULT_ROLE_IDS = ["product", "ops", "copywriter"];

export const TASK_TEMPLATES = [
  {
    title: "写小红书笔记",
    prompt:
      "帮我为猫咪互动玩具写 10 篇小红书笔记，目标用户是新手养猫人，要求真实、有场景感、适合种草。"
  },
  {
    title: "生成 30 天选题",
    prompt:
      "我卖宠物玩具，请帮我生成 30 天小红书内容选题，覆盖猫玩具、狗玩具、避坑、测评、场景和清单。"
  },
  {
    title: "分析宠物玩具卖点",
    prompt:
      "请分析一款宠物互动玩具的小红书卖点，产品特点是耐咬、可互动、适合猫狗日常消耗精力。"
  },
  {
    title: "生成短视频脚本",
    prompt:
      "请为宠物玩具生成 5 条小红书短视频脚本，每条包含开头钩子、镜头、口播和结尾引导。"
  },
  {
    title: "生成客服话术",
    prompt:
      "请为宠物玩具店生成客服话术，覆盖材质、安全、尺寸、清洁、发货、售后和不爱玩的情况。"
  },
  {
    title: "复盘笔记数据",
    prompt:
      "请帮我复盘一篇宠物玩具小红书笔记：曝光 1200，点赞 35，收藏 18，评论 6，进店 12，成交 1。"
  }
];
