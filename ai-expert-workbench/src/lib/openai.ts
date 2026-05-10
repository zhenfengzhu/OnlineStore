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
2. 每条都要包含标题、封面文案、正文、标签、拍摄建议、适合人群和风险提醒。
3. calendar 可以返回 3 条配套发布安排。
4. scripts 返回空数组或与笔记相关的简单视频改编方向。`,
    content_calendar: `${base}
任务：生成 30 天内容日历。
要求：
1. calendar 必须正好返回 30 条。
2. 每条都要包含 day、topic、format、angle、assetTitle、goal。
3. 选题要覆盖图文、短视频、测评、避坑、清单和生活场景。
4. notes 最多返回 3 条代表性样稿，scripts 最多返回 2 条参考脚本。`,
    video_scripts: `${base}
任务：生成短视频脚本。
要求：
1. scripts 至少返回 8 条。
2. 每条都要包含标题、开头钩子、镜头列表、口播和结尾引导。
3. notes 可以返回 2-3 条对应视频标题的图文改写版本。
4. calendar 可以返回 7 条短视频发布安排。`
  };

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
你是小红书标题编辑，擅长把同一个主题拆成多种可点击、可收藏、可测试的标题版本。

任务：
1. 围绕用户给出的创作 brief 生成 12 个标题。
2. 标题必须覆盖这些风格：${preferredStyles.join(", ")}。
3. 每个标题都要标出 style、intent 和 scoreHint。

要求：
1. 标题要像真实创作者会发的，不要像广告语。
2. 不要使用夸大承诺、医疗化、绝对化表达。
3. 同一批标题要有明显差异，不要只是换几个词。
4. scoreHint 用简短中文说明它更偏点击、收藏、互动还是转化。
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
你是一个资深小红书内容编辑，负责在发布前帮创作者做最后一轮体检。
当前内容类型：${assetType}

请至少检查这些维度：
1. 标题吸引力
2. 开头钩子
3. 收藏感/干货感
4. 互动引导
5. 风险表达
6. 结构完整度

要求：
1. 每一项都要给出明确 status：good、watch 或 fix。
2. advice 必须具体，告诉创作者哪里该改、怎么改。
3. overallSuggestion 用 1-2 句话总结这条内容现在更适合直接发，还是建议再改一下。
4. 只输出 JSON。
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
