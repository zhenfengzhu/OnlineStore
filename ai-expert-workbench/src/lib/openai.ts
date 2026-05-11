import OpenAI from "openai";
import { getActiveModelConfig } from "@/lib/model-providers";
import type {
  PrePublishCheckOutput,
  RewriteMode,
  TitleStyle,
  TitleWorkshopOutput,
  WorkflowOutput,
  WorkflowType
} from "@/lib/types";

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
          visualSuggestion: { type: "string" },
          body: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          shootingSuggestion: { type: "string" },
          firstCommentVariants: { type: "array", items: { type: "string" } },
          interactionScripts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                scenario: { type: "string" },
                userQuery: { type: "string" },
                aiReply: { type: "string" }
              },
              required: ["scenario", "userQuery", "aiReply"]
            }
          },
          targetAudience: { type: "string" },
          riskTip: { type: "string" }
        },
        required: [
          "title",
          "coverText",
          "visualSuggestion",
          "body",
          "tags",
          "shootingSuggestion",
          "firstCommentVariants",
          "interactionScripts",
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
          ending: { type: "string" },
          interactionHook: { type: "string" }
        },
        required: ["title", "hook", "shots", "voiceover", "ending", "interactionHook"]
      }
    },
    nextActions: { type: "array", items: { type: "string" } }
  },
  required: ["summary", "notes", "calendar", "scripts", "nextActions"]
} as const;

const rewriteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    summary: { type: "string" }
  },
  required: ["title", "body", "summary"]
} as const;

const titleWorkshopSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    titles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          style: {
            type: "string",
            enum: ["emotional", "list", "warning", "contrast", "experience"]
          },
          intent: { type: "string" },
          scoreHint: { type: "string" }
        },
        required: ["text", "style", "intent", "scoreHint"]
      }
    }
  },
  required: ["summary", "titles"]
} as const;

const prePublishCheckSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallSuggestion: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          status: {
            type: "string",
            enum: ["good", "watch", "fix"]
          },
          advice: { type: "string" }
        },
        required: ["name", "status", "advice"]
      }
    },
    optimizedContent: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        body: { type: "string" }
      }
    }
  },
  required: ["overallSuggestion", "checks"]
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
    throw new Error("模型没有返回可解析的内容。");
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

function getWorkflowPrompt(type: WorkflowType) {
  const base = `
你是一个小红书内容生成专家，负责把用户给出的主题、卖点、受众和目标，转成可以直接使用的内容草稿。
要求：
1. 输出务必真实、具体、可执行，避免夸大、绝对化和医疗化表达。
2. 语气贴近真实用户分享，保留平台内容感，但不要堆砌夸张词。
3. 如果某个字段与当前任务关系不大，返回空数组，不要编造无关内容。
4. 正文要有可读的段落结构，适合直接复制后二次修改。
`;

  const prompts: Record<WorkflowType, string> = {
    thirty_notes: `${base}
任务：生成 3 篇小红书图文笔记。
要求：
1. notes 必须正好返回 3 条。
2. 每条都要包含标题、封面文案、视觉建议（封面排版与氛围）、正文、标签、拍摄建议、首评策略、互动问答脚本、适合人群和风险提醒。
3. 视觉建议要具体：如“左侧大字报+右侧产品细节图，背景使用奶油色”。
4. firstCommentVariants 必须返回 3 个不同维度的首评：
   - 维度1：补充信息/利益点 (例如：“姐妹们，这款还有隐藏赠品...”)。
   - 维度2：引导互动 (例如：“你们觉得哪个颜色更好看？A还是B？”)。
   - 维度3：真实用户好评感 (例如：“上周刚入，真的不踩雷！”)。
5. interactionScripts 至少提供 3 组针对该内容的潜在用户提问及标准回复模板（scenario/userQuery/aiReply）。
6. calendar 可以返回 3 条配套发布安排。`,
    content_calendar: `${base}
任务：生成 30 天内容日历。
要求：
1. calendar 必须正好返回 30 条。
2. 每条都要包含 day、topic、format、angle、assetTitle、goal。
3. 选题要符合阶梯式节奏：第1周侧重人设与专业干货，第2-3周侧重种草与真实体验，第4周侧重转化与大促感。
4. notes 最多返回 3 条代表性样稿，scripts 最多返回 2 条参考脚本。`,
    video_scripts: `${base}
任务：生成短视频脚本。
要求：
1. scripts 至少返回 8 条。
2. 每条都要包含标题、开头钩子、镜头列表、口播、结尾引导和互动钩子。
3. 互动钩子要设计在视频中间或结尾，引导点赞收藏或回复暗号。
4. notes 可以返回 2-3 条对应视频标题的图文改写版本。`
  };

  (prompts as any).inspiration_rewrite = `${base}
任务：爆款反推 (Reverse Engineering)。
要求：
1. 你会收到一段“参考爆文 (Reference Content)”。
2. 第一步：深度分析参考文案的“爆款公式”，包括：
   - 钩子类型 (如：反直觉、利益诱惑、避坑提醒)。
   - 内容结构 (如：痛点叙述 -> 解决方案 -> 价值升华)。
   - 语气特色 (如：毒舌闺蜜、专业导师、佛系分享)。
   - 互动埋点。
3. 第二步：保持该公式不变，将“用户输入 (userInput)”中的产品/主题代入。
4. 第三步：生成 3 篇全新的小红书笔记，存放在 notes 字段中。
   - 必须包含配套的 firstCommentVariants (3个不同维度的首评) 和 interactionScripts (互动回复脚本)。
5. summary 字段中请简要说明你提取到的“爆款公式”。`;

  return prompts[type];
}

function getRewritePrompt(mode: RewriteMode, assetType: string) {
  const modePrompt: Record<RewriteMode, string> = {
    more_conversational: "把内容改得更像真人在分享，口语一点，别像AI摘要。",
    shorter: "压缩内容长度，保留核心信息，让它更利落好发。",
    more_saveworthy: "增强干货感、清单感和可收藏性，但不要变成空泛套路。",
    video_voiceover: "改成适合短视频口播的版本，句子更短，更容易一口气念出来。"
  };

  return `
你是小红书内容编辑，擅长把现有内容做二次打磨。
当前内容类型：${assetType}
改写目标：${modePrompt[mode]}

要求：
1. 保留原内容的核心观点和信息密度。
2. 不要编造原文没有的效果承诺。
3. 标题也要一起优化，但不要和正文脱节。
4. 只输出 JSON。
`;
}

export async function runWorkflow({
  type,
  userInput
}: {
  type: WorkflowType;
  userInput: string;
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      workflowType: type,
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

export async function runRewrite({
  mode,
  title,
  content,
  assetType
}: {
  mode: RewriteMode;
  title: string;
  content: string;
  assetType: string;
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      title,
      content,
      assetType,
      rewriteMode: mode
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
          content: `${getRewritePrompt(mode, assetType)}\n${getJsonInstruction("rewrite_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<{ title: string; body: string; summary: string }>(
      response.choices[0]?.message?.content ?? ""
    );
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: getRewritePrompt(mode, assetType)
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "rewrite_response",
        schema: rewriteSchema,
        strict: true
      }
    }
  });

  return parseOutput<{ title: string; body: string; summary: string }>(response.output_text);
}

function getTitleWorkshopPrompt(preferredStyles: TitleStyle[]) {
  return `
你是小红书爆文标题专家，擅长利用人性弱点和心理钩子制造点击欲望。
任务：围绕创作 brief 生成 12 个极具诱惑力的标题。

标题必须包含以下心理策略：
1. 利益暴击（清单型/经验型）：直接给结果。
2. 恐惧/焦虑（避坑型）：不看就亏。
3. 反差冲突（反差型）：打破认知。
4. 情绪共鸣（情绪型）：说出心声。

要求：
1. 风格覆盖：${preferredStyles.join(", ")}。
2. 必须包含小红书特色表情符号（Emoji），但不要堆砌。
3. 标题要短小精悍，核心关键词前置，避免书面语。
4. scoreHint 评估该标题的“爆款潜质”（1-10分）并说明原因。
`;
}

export async function runTitleWorkshop({
  userInput,
  preferredStyles
}: {
  userInput: string;
  preferredStyles: TitleStyle[];
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      userInput,
      preferredStyles
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
          content: `${getTitleWorkshopPrompt(preferredStyles)}\n${getJsonInstruction("title_workshop_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<TitleWorkshopOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: getTitleWorkshopPrompt(preferredStyles)
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "title_workshop_response",
        schema: titleWorkshopSchema,
        strict: true
      }
    }
  });

  return parseOutput<TitleWorkshopOutput>(response.output_text);
}

function getPrePublishCheckPrompt(assetType: string) {
  return `
你是一个资深小红书内容编辑，负责在发布前帮创作者做最后的一轮“流量体检”与“合规雷达”扫描。
当前内容类型：${assetType}

请深度检查这些维度：
1. 标题吸引力：是否有心理钩子？是否在瀑布流中能一眼抓人？
2. 封面文案：是否清晰？是否传达了核心利益点？
3. 开头 3 行：是否在 2 秒内留住了用户？
4. 收藏/干货密度：内容是否值得用户点“收藏”？
5. 互动伏笔：是否设计了让用户想评论的槽点或问题？
6. 违规词/限流风险：严查医疗词、绝对化用词、诱导私下交易等。
7. SEO 埋点：核心关键词是否自然融入？

要求：
1. 每一项都要给出明确 status：good（优秀）、watch（建议微调）、fix（必须修改）。
2. advice 必须毒舌且精准，直接告诉创作者哪里“太AI了”或“太硬广了”，并给出改写范例。
3. 如果你在检查中发现了任何 status 为 "fix" 或 "watch" 的问题，请在 optimizedContent 字段中提供一份“修正/优化后的完整版本”。
   - 替换掉所有违规词（如将“第一”改为“天花板级别”）。
   - 优化标题的钩子。
   - 调整正文开头的节奏。
   - 确保 optimizedContent 里的 title 和 body 是完整的文案，可以直接覆盖原内容。
4. overallSuggestion 用 1-2 句话总结这条内容现在的爆文潜质评分（1-10分）。
5. 只输出 JSON。
`;
}

export async function runPrePublishCheck({
  title,
  content,
  assetType
}: {
  title: string;
  content: string;
  assetType: string;
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      title,
      content,
      assetType
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
          content: `${getPrePublishCheckPrompt(assetType)}\n${getJsonInstruction("prepublish_check_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<PrePublishCheckOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: getPrePublishCheckPrompt(assetType)
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "prepublish_check_response",
        schema: prePublishCheckSchema,
        strict: true
      }
    }
  });

  return parseOutput<PrePublishCheckOutput>(response.output_text);
}

export async function runExpertSkill({
  userInput
}: {
  userInput: string;
}) {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: "system",
        content: "你是一位专业的小红书运营专家。请根据用户的指令和输入，提供专业、毒舌且极具实操性的建议。字数不限，但要字字珠玑。"
      },
      { role: "user", content: userInput }
    ]
  });

  return { output: response.choices[0]?.message?.content ?? "" };
}

export async function generateImage({
  prompt,
  size = "1024x1792", // Optimized for vertical Xiaohongshu posts
  quality = "standard"
}: {
  prompt: string;
  size?: "1024x1024" | "1024x1792";
  quality?: "standard" | "hd";
}) {
  const client = getClient();
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: `小红书风，${prompt}。风格要求：高质量摄影或精美插画，光影专业，构图高级，适合做笔记封面。`,
    n: 1,
    size,
    quality,
    response_format: "b64_json"
  });

  return response.data[0].b64_json;
}
