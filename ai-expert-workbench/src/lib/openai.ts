import OpenAI from "openai";
import type { ExpertRoleConfig } from "@/lib/experts";
import { getActiveModelConfig } from "@/lib/model-providers";
import type {
  CoordinatorStructuredOutput,
  ExpertStructuredOutput,
  ProductView,
  WorkflowOutput,
  WorkflowType
} from "@/lib/types";

const expertSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    actionItems: { type: "array", items: { type: "string" } },
    draftContent: { type: "string" },
    cautions: { type: "array", items: { type: "string" } }
  },
  required: ["summary", "keyPoints", "actionItems", "draftContent", "cautions"]
} as const;

const coordinatorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    finalPlanMarkdown: { type: "string" },
    nextActions: { type: "array", items: { type: "string" } }
  },
  required: ["title", "finalPlanMarkdown", "nextActions"]
} as const;

const workflowSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    notes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          coverText: { type: "string" },
          body: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          shootingSuggestion: { type: "string" },
          targetAudience: { type: "string" },
          riskTip: { type: "string" }
        },
        required: [
          "title",
          "coverText",
          "body",
          "tags",
          "shootingSuggestion",
          "targetAudience",
          "riskTip"
        ]
      }
    },
    calendar: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "number" },
          topic: { type: "string" },
          format: { type: "string" },
          angle: { type: "string" },
          assetTitle: { type: "string" },
          goal: { type: "string" }
        },
        required: ["day", "topic", "format", "angle", "assetTitle", "goal"]
      }
    },
    scripts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          shots: { type: "array", items: { type: "string" } },
          voiceover: { type: "string" },
          ending: { type: "string" }
        },
        required: ["title", "hook", "shots", "voiceover", "ending"]
      }
    },
    supportReplies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scenario: { type: "string" },
          reply: { type: "string" }
        },
        required: ["scenario", "reply"]
      }
    },
    analysisMarkdown: { type: "string" },
    nextActions: { type: "array", items: { type: "string" } }
  },
  required: [
    "summary",
    "notes",
    "calendar",
    "scripts",
    "supportReplies",
    "analysisMarkdown",
    "nextActions"
  ]
} as const;

function getClient() {
  const active = getActiveModelConfig();
  if (!active.configured) {
    throw new Error(getModelConfigError());
  }

  return new OpenAI({
    apiKey: active.apiKey,
    baseURL: active.provider.id === "openai" ? undefined : active.baseURL
  });
}

export function hasModelConfig() {
  return getActiveModelConfig().configured;
}

export function getModelConfigError() {
  const active = getActiveModelConfig();
  return `缺少 ${active.provider.name} 配置，请检查 ${active.provider.apiKeyEnv}、${active.provider.modelEnv} 和接口地址。`;
}

function parseOutput<T>(rawText: string): T {
  if (!rawText) {
    throw new Error("模型没有返回可解析内容。");
  }

  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(jsonText) as T;
}

function getModel() {
  return getActiveModelConfig().model;
}

function shouldUseResponsesApi() {
  return getActiveModelConfig().provider.apiStyle === "responses";
}

function getJsonInstruction(schemaName: string) {
  return `
你必须只输出一个合法 JSON 对象，不要输出 Markdown，不要输出解释。
JSON 对象必须符合 ${schemaName} 的字段要求；数组字段不能省略，无内容时返回空数组。
`;
}

export async function runExpert(role: ExpertRoleConfig, userInput: string) {
  const client = getClient();
  if (!shouldUseResponsesApi()) {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: `${role.systemPrompt}\n${getJsonInstruction("expert_response")}` },
        { role: "user", content: `用户任务：${userInput}` }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<ExpertStructuredOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: role.systemPrompt
      },
      {
        role: "user",
        content: `用户任务：${userInput}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "expert_response",
        schema: expertSchema,
        strict: true
      }
    }
  });

  return parseOutput<ExpertStructuredOutput>(response.output_text);
}

export async function runCoordinator(
  coordinator: ExpertRoleConfig,
  userInput: string,
  expertOutputs: Array<{ roleName: string; output: ExpertStructuredOutput }>
) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      userTask: userInput,
      expertOutputs
    },
    null,
    2
  );

  if (!shouldUseResponsesApi()) {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: `${coordinator.systemPrompt}\n${getJsonInstruction("coordinator_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<CoordinatorStructuredOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: coordinator.systemPrompt
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "coordinator_response",
        schema: coordinatorSchema,
        strict: true
      }
    }
  });

  return parseOutput<CoordinatorStructuredOutput>(response.output_text);
}

function getWorkflowPrompt(type: WorkflowType) {
  const base = `
你是小红书电商 AI 运营工作台的商业级内容专家，主场景是宠物玩具。
所有输出必须真实、具体、可执行，避免夸大功效、医疗化表达和绝对化承诺。
不要写“绝对安全”“永远咬不坏”“治愈焦虑”“保证爆单”。
如果某个字段与当前任务无关，返回空数组或简短说明，但 JSON 结构必须完整。

【小红书网感格式要求】
1. 标题必须有极强的网感（例如使用“情绪词+痛点+解决方案”公式，或制造反差感），并且多使用Emoji。
2. 正文必须符合小红书排版：单行不超过15个字，大量留白，多用恰当的Emoji穿插，语气要像闺蜜分享或懂行的测评专家（多用“姐妹们”、“绝绝子”、“真心建议”、“避坑”等口语化表达）。
`;

  const prompts: Record<WorkflowType, string> = {
    thirty_notes: `${base}
任务：基于产品资料生成 30 篇小红书笔记。
notes 必须正好 30 条，每条包含标题（必须提供3-5个AB测试备选标题，用斜杠/分隔）、封面文案（强调首图吸睛点）、正文、标签、拍摄建议、目标人群和风险提示。
calendar 可同步返回 30 天排期，scripts/supportReplies 可为空数组。`,
    content_calendar: `${base}
任务：生成 30 天内容发布日历。
calendar 必须正好 30 条，覆盖测评、避坑、清单、场景、对比、短视频、评论区回应。
notes 可返回 5 条代表性笔记，scripts/supportReplies 可为空数组。`,
    video_scripts: `${base}
任务：生成小红书短视频脚本。
scripts 至少 8 条，每条包含开头钩子、镜头、口播和结尾引导。
notes 可返回对应标题，calendar/supportReplies 可为空数组。`,
    support_scripts: `${base}
任务：生成宠物玩具电商客服话术。
supportReplies 至少 12 条，覆盖材质、安全、尺寸、清洁、发货、售后、不爱玩、退换货。
notes/calendar/scripts 可为空数组。`,
    competitor_analysis: `${base}
任务：拆解用户粘贴的竞品小红书笔记。
analysisMarkdown 必须包含：首图吸睛点提取、标题结构、卖点表达、用户痛点、爆款评论区分析（深入挖掘用户真实需求）、可借鉴方向、不可照抄风险。
notes 返回 5 条可借鉴但不搬运的新选题。`,
    data_review: `${base}
任务：复盘小红书笔记数据。
analysisMarkdown 必须包含数据判断、问题定位、下一篇优化、是否继续做同类选题、需要观察的指标。
calendar 返回未来 7 天优化排期。`,
    product_scoring: `${base}
任务：做选品评分，判断这个宠物玩具是否值得主推。
analysisMarkdown 必须包含：总分 100、内容展示性、痛点强度、决策门槛、复购可能、竞争强度、利润空间、售后风险、是否建议主推、建议价格带、主推人群、内容切入角度、风险点。
notes/scripts/supportReplies/calendar 返回空数组。`,
    product_page: `${base}
任务：优化小红书店铺商品页。
analysisMarkdown 必须包含：商品标题、主图卖点顺序、详情页结构、规格命名、价格锚点、FAQ、评价引导、活动话术、合规风险。
supportReplies 返回至少 8 条商品页 FAQ。
notes 返回 3 条可引流到商品页的笔记标题和正文。`,
    comment_ops: `${base}
任务：设计评论区高情商运营与引流方案。
analysisMarkdown 必须包含：置顶评论、问链接回复（高情商引导加V或进店）、质疑回复、说贵回复、对比竞品回复、安全/材质回复、评论区二次种草话术、可转成笔记的新问题。
supportReplies 至少 12 条，每条是一个评论场景和回复（要求防折叠、口语化）。`,
    viral_reuse: `${base}
任务：把一篇表现好的内容复用放大。
analysisMarkdown 必须包含：爆点判断、可复用结构、标题 A/B、封面文案 A/B、图文改短视频、短视频改图文、评论问题改新笔记、后续 7 天追发计划。
notes 返回 10 条同主题变体选题，calendar 返回 7 天追发排期。`,
    seo_keywords: `${base}
任务：挖掘小红书 SEO 搜索热词与长尾词。
analysisMarkdown 必须包含：核心词检索意图分析、下拉框长尾词预测、蓝海词推荐、搜索卡位建议（图文还是视频）。
notes 返回 3 条带搜索词话题的笔记选题，calendar/scripts/supportReplies 返回空数组。`,
    ad_strategy: `${base}
任务：基于笔记初期数据给出投流（薯条/聚光）决策辅助。
analysisMarkdown 必须包含：互动率计算（赞藏评/阅读量）、转化漏斗诊断、对标行业优秀线（宠物赛道互动率建议 8% 以上）、投流决策（例如：放弃投流、投 100 元定向互动测试跑量）、下一步修改建议。
notes/calendar/scripts/supportReplies 返回空数组。`
  };

  return prompts[type];
}

export async function runWorkflow({
  type,
  product,
  userInput
}: {
  type: WorkflowType;
  product?: ProductView | null;
  userInput: string;
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      workflowType: type,
      product,
      userInput
    },
    null,
    2
  );

  if (!shouldUseResponsesApi()) {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: `${getWorkflowPrompt(type)}\n${getJsonInstruction("workflow_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<WorkflowOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: getWorkflowPrompt(type)
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "workflow_response",
        schema: workflowSchema,
        strict: true
      }
    }
  });

  return parseOutput<WorkflowOutput>(response.output_text);
}

export async function generateImage(prompt: string) {
  const client = getClient();
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1792",
    response_format: "url"
  });
  return response.data[0].url;
}
