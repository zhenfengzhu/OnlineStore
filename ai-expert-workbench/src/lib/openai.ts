import OpenAI from "openai";
import { formatXiaohongshuGraphicRules } from "@/lib/content-rule-defaults";
import { getContentRules } from "@/lib/content-rules";
import { getActiveModelConfig } from "@/lib/model-providers";
import type {
  ChatMessageView,
  PrePublishCheckOutput,
  RewriteMode,
  TitleStyle,
  TitleWorkshopOutput,
  WorkflowOutput,
  WorkflowType,
  XiaohongshuAnalysisOutput
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
          riskTip: { type: "string" },
          evidenceScene: { type: "string" },
          concreteDetail: { type: "string" },
          mildDrawback: { type: "string" },
          fitBoundary: { type: "string" },
          interactionQuestion: { type: "string" }
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
          "riskTip",
          "evidenceScene",
          "concreteDetail",
          "mildDrawback",
          "fitBoundary",
          "interactionQuestion"
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

const xiaohongshuAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    hookType: { type: "string" },
    titleAnalysis: { type: "string" },
    openingAnalysis: { type: "string" },
    titleFormula: { type: "string" },
    openingHook: { type: "string" },
    bodyFormula: { type: "string" },
    contentStructure: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          section: { type: "string" },
          purpose: { type: "string" },
          originalSignal: { type: "string" },
          reusableMove: { type: "string" }
        },
        required: ["section", "purpose", "originalSignal", "reusableMove"]
      }
    },
    sellingPoints: { type: "array", items: { type: "string" } },
    emotionTriggers: { type: "array", items: { type: "string" } },
    interactionHooks: { type: "array", items: { type: "string" } },
    visualNotes: { type: "array", items: { type: "string" } },
    visualPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          imageIndex: { type: "number" },
          role: { type: "string" },
          creatorAction: { type: "string" }
        },
        required: ["imageIndex", "role", "creatorAction"]
      }
    },
    missingVisuals: { type: "array", items: { type: "string" } },
    riskNotes: { type: "array", items: { type: "string" } },
    valueScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          reason: { type: "string" }
        },
        required: ["name", "score", "reason"]
      }
    },
    transferableMoves: { type: "array", items: { type: "string" } },
    doNotReuse: { type: "array", items: { type: "string" } },
    reusableFormula: { type: "string" },
    rewriteBrief: {
      type: "object",
      additionalProperties: false,
      properties: {
        targetAudience: { type: "string" },
        contentAngle: { type: "string" },
        emotionHook: { type: "string" },
        productFit: { type: "string" },
        replaceableVariables: { type: "array", items: { type: "string" } },
        forbiddenRisks: { type: "array", items: { type: "string" } }
      },
      required: ["targetAudience", "contentAngle", "emotionHook", "productFit", "replaceableVariables", "forbiddenRisks"]
    }
  },
  required: [
    "summary",
    "hookType",
    "titleAnalysis",
    "openingAnalysis",
    "titleFormula",
    "openingHook",
    "bodyFormula",
    "contentStructure",
    "sellingPoints",
    "emotionTriggers",
    "interactionHooks",
    "visualNotes",
    "visualPlan",
    "missingVisuals",
    "riskNotes",
    "valueScores",
    "transferableMoves",
    "doNotReuse",
    "reusableFormula",
    "rewriteBrief"
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

export function getCurrentModelName() {
  return getModel();
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

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function toTextArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => toText(item)).filter(Boolean)
    : [];
}

function firstTextValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toText(source[key]);
    if (value) return value;
  }

  return "";
}

function cleanGeneratedNoteBody(value: string) {
  return value
    .replace(/^# .*(?:\r?\n)+/, "")
    .split(/\n\s*(?:🏷️\s*)?标签[:：]/)[0]
    .split(/\n\s*(?:🎬\s*)?拍摄建议[:：]/)[0]
    .split(/\n\s*(?:💬\s*)?首评/)[0]
    .split(/\n\s*(?:🔥\s*)?互动/)[0]
    .split(/\n\s*(?:👥\s*)?适合人群[:：]/)[0]
    .split(/\n\s*(?:⚠️\s*)?风险提醒[:：]/)[0]
    .trim();
}

function normalizeWorkflowOutput(rawOutput: unknown): WorkflowOutput {
  const output = rawOutput as Partial<WorkflowOutput> | null;
  const notes = Array.isArray(output?.notes)
    ? output.notes.map((note) => {
        const rawNote = note as Partial<WorkflowOutput["notes"][number]>;
        const rawNoteRecord = note && typeof note === "object" ? note as Record<string, unknown> : {};
        const rawScripts = Array.isArray(rawNote.interactionScripts) ? rawNote.interactionScripts : [];
        const noteBody = cleanGeneratedNoteBody(
          firstTextValue(rawNoteRecord, ["body", "content", "text", "copy", "正文", "mainText"])
        );

        return {
          title: toText(rawNote.title, "未命名笔记"),
          coverText: toText(rawNote.coverText),
          visualSuggestion: toText(rawNote.visualSuggestion),
          body: noteBody,
          tags: toTextArray(rawNote.tags),
          shootingSuggestion: toText(rawNote.shootingSuggestion),
          firstCommentVariants: toTextArray(rawNote.firstCommentVariants),
          interactionScripts: rawScripts
            .map((script) => {
              const rawScript = script as Partial<WorkflowOutput["notes"][number]["interactionScripts"][number]>;
              return {
                scenario: toText(rawScript.scenario),
                userQuery: toText(rawScript.userQuery),
                aiReply: toText(rawScript.aiReply)
              };
            })
            .filter((script) => script.scenario || script.userQuery || script.aiReply),
          targetAudience: toText(rawNote.targetAudience),
          riskTip: toText(rawNote.riskTip),
          evidenceScene: firstTextValue(rawNoteRecord, ["evidenceScene", "sceneProof", "真实场景", "使用场景证据"]),
          concreteDetail: firstTextValue(rawNoteRecord, ["concreteDetail", "detailProof", "具体细节", "细节证据"]),
          mildDrawback: firstTextValue(rawNoteRecord, ["mildDrawback", "drawback", "minorCon", "轻微缺点"]),
          fitBoundary: firstTextValue(rawNoteRecord, ["fitBoundary", "boundary", "适用边界", "适合不适合"]),
          interactionQuestion: firstTextValue(rawNoteRecord, ["interactionQuestion", "question", "互动问题", "结尾提问"])
        };
      })
    : [];
  const calendar = Array.isArray(output?.calendar)
    ? output.calendar.map((item, index) => {
        const rawItem = item as Partial<WorkflowOutput["calendar"][number]>;
        return {
          day: typeof rawItem.day === "number" ? rawItem.day : index + 1,
          topic: toText(rawItem.topic),
          format: toText(rawItem.format),
          angle: toText(rawItem.angle),
          assetTitle: toText(rawItem.assetTitle),
          goal: toText(rawItem.goal)
        };
      })
    : [];
  const scripts = Array.isArray(output?.scripts)
    ? output.scripts.map((script) => {
        const rawScript = script as Partial<WorkflowOutput["scripts"][number]>;
        return {
          title: toText(rawScript.title, "未命名脚本"),
          hook: toText(rawScript.hook),
          shots: toTextArray(rawScript.shots),
          voiceover: toText(rawScript.voiceover),
          ending: toText(rawScript.ending),
          interactionHook: toText(rawScript.interactionHook)
        };
      })
    : [];

  return {
    summary: toText(output?.summary, "已生成内容。"),
    notes,
    calendar,
    scripts,
    nextActions: toTextArray(output?.nextActions)
  };
}

function assertWorkflowOutputIsUsable(type: WorkflowType, output: WorkflowOutput) {
  if (type === "thirty_notes" && output.notes.length !== 1) {
    throw new Error("模型没有返回 1 篇完整图文笔记，请重试。");
  }

  const emptyNotes = output.notes.filter((note) => !note.body.trim());
  if (emptyNotes.length > 0) {
    const names = emptyNotes.map((note) => note.title).filter(Boolean).join("、");
    throw new Error(`模型返回的图文笔记正文为空${names ? `：${names}` : ""}。请重新生成。`);
  }

  const weakEvidenceNotes = output.notes.filter(
    (note) => !note.evidenceScene || !note.concreteDetail || !note.mildDrawback || !note.fitBoundary || !note.interactionQuestion
  );
  if (weakEvidenceNotes.length > 0) {
    const names = weakEvidenceNotes.map((note) => note.title).filter(Boolean).join("、");
    throw new Error(`模型返回的图文笔记缺少真实证据要素${names ? `：${names}` : ""}。请重新生成。`);
  }
}

const titleStyles: TitleStyle[] = ["emotional", "list", "warning", "contrast", "experience"];

function normalizeTitleWorkshopOutput(rawOutput: unknown): TitleWorkshopOutput {
  const output = rawOutput as Partial<TitleWorkshopOutput> | null;
  const rawTitles = Array.isArray(output?.titles) ? output.titles : [];
  const titles = rawTitles
    .map((item) => {
      const rawItem = item as Partial<TitleWorkshopOutput["titles"][number]>;
      const text = typeof rawItem.text === "string" ? rawItem.text.trim() : "";
      const style = titleStyles.includes(rawItem.style as TitleStyle)
        ? (rawItem.style as TitleStyle)
        : "experience";

      return {
        text,
        style,
        intent: typeof rawItem.intent === "string" ? rawItem.intent.trim() : "",
        scoreHint: typeof rawItem.scoreHint === "string" ? rawItem.scoreHint.trim() : ""
      };
    })
    .filter((item) => item.text);

  if (titles.length === 0) {
    throw new Error("模型没有返回可用的标题建议，请重试。");
  }

  return {
    summary: typeof output?.summary === "string" && output.summary.trim()
      ? output.summary.trim()
      : "已生成标题建议。",
    titles
  };
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

function getXiaohongshuGraphicRules() {
  return formatXiaohongshuGraphicRules(getContentRules().xiaohongshuGraphicRules);
}

function getWorkflowPrompt(type: WorkflowType) {
  const base = `
你是一个小红书内容生成专家，负责把用户给出的主题、卖点、受众和目标，转成可以直接使用的内容草稿。
要求：
1. 输出务必真实、具体、可执行，避免夸大、绝对化和医疗化表达。
2. 语气贴近真实用户分享，保留平台内容感，但不要堆砌夸张词。
3. 如果某个字段与当前任务关系不大，返回空数组，不要编造无关内容。
4. notes[].body 只能放正文，不要包含标题、封面文案、封面视觉建议、标签、拍摄建议、首评、互动脚本、适合人群或风险提醒。
5. notes[].body 必须是可直接发布的小红书正文，至少 5 段、300 字左右，不能留空，不能只写占位符。
6. 每篇 notes 必须返回 evidenceScene、concreteDetail、mildDrawback、fitBoundary、interactionQuestion，用来证明内容不是硬广。
${getXiaohongshuGraphicRules()}
`;

  const prompts: Record<WorkflowType, string> = {
    thirty_notes: `${base}
任务：生成 1 篇小红书图文笔记。
要求：
1. notes 必须正好返回 1 条，不要一次返回多篇。
2. 这 1 条必须包含标题、封面文案、视觉建议（封面排版与氛围）、正文、标签、拍摄建议、首评策略、互动问答脚本、适合人群、风险提醒和证据要素。
3. 视觉建议要具体：如“左侧大字报+右侧产品细节图，背景使用奶油色”。
4. firstCommentVariants 必须返回 3 个不同维度的首评：
   - 维度1：补充信息/利益点 (例如：“姐妹们，这款还有隐藏赠品...”)。
   - 维度2：引导互动 (例如：“你们觉得哪个颜色更好看？A还是B？”)。
   - 维度3：真实用户好评感 (例如：“上周刚入，真的不踩雷！”)。
5. interactionScripts 至少提供 3 组针对该内容的潜在用户提问及标准回复模板（scenario/userQuery/aiReply）。
6. evidenceScene 写一个真实使用场景；concreteDetail 写一个具体细节；mildDrawback 写一个轻微缺点；fitBoundary 写适合/不适合人群；interactionQuestion 写正文结尾可用的问题。
7. calendar 可以返回 1 条配套发布安排。`,
    content_calendar: `${base}
任务：生成 30 天内容日历。
要求：
1. calendar 必须正好返回 30 条。
2. 每条都要包含 day、topic、format、angle、assetTitle、goal。
3. 选题要符合阶梯式节奏：第1周侧重人设与专业干货，第2-3周侧重种草与真实体验，第4周侧重转化与大促感。
4. notes 最多返回 3 条代表性样稿，scripts 返回空数组。`,
    inspiration_rewrite: `${base}
任务：爆款反推 (Reverse Engineering)。
要求：
1. 你会收到一段“参考爆文 (Reference Content)”。
2. 第一步：深度分析参考文案的“爆款公式”，包括：
   - 钩子类型 (如：反直觉、利益诱惑、避坑提醒)。
   - 内容结构 (如：痛点叙述 -> 解决方案 -> 价值升华)。
   - 语气特色 (如：毒舌闺蜜、专业导师、佛系分享)。
   - 互动埋点。
3. 第二步：保持该公式不变，将“用户输入 (userInput)”中的产品/主题代入。
4. 第三步：生成 1 篇全新的小红书笔记，存放在 notes 字段中。
   - 必须包含配套的 firstCommentVariants (3个不同维度的首评) 和 interactionScripts (互动回复脚本)。
5. summary 字段中请简要说明你提取到的“爆款公式”。`
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

    const output = normalizeWorkflowOutput(
      parseOutput<WorkflowOutput>(response.choices[0]?.message?.content ?? "")
    );
    assertWorkflowOutputIsUsable(type, output);
    return output;
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

  const output = normalizeWorkflowOutput(parseOutput<WorkflowOutput>(response.output_text));
  assertWorkflowOutputIsUsable(type, output);
  return output;
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

${getXiaohongshuGraphicRules()}

标题必须包含以下心理策略：
1. 利益暴击（清单型/经验型）：直接给结果。
2. 恐惧/焦虑（避坑型）：不看就亏。
3. 反差冲突（反差型）：打破认知。
4. 情绪共鸣（情绪型）：说出心声。

要求：
1. 风格覆盖：${preferredStyles.join(", ")}。
2. 标题控制在 15-25 个字，手机端一眼能看完。
3. 覆盖数字型、疑问型、情绪型、清单型、反差型，不要全部同一种句式。
4. 可以使用小红书特色 Emoji，但不要堆砌。
5. 核心关键词前置，避免书面语和广告腔。
6. scoreHint 评估该标题的“爆款潜质”（1-10分）并说明原因。
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

    return normalizeTitleWorkshopOutput(
      parseOutput<TitleWorkshopOutput>(response.choices[0]?.message?.content ?? "")
    );
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

  return normalizeTitleWorkshopOutput(parseOutput<TitleWorkshopOutput>(response.output_text));
}

function getPrePublishCheckPrompt(assetType: string) {
  return `
你是一个资深小红书内容编辑，负责在发布前帮创作者做最后的一轮“流量体检”与“合规雷达”扫描。
当前内容类型：${assetType}

请深度检查这些维度：
1. 标题长度与钩子：标题是否 15-25 字内？是否有数字、疑问、情绪、清单、反差等点击理由？
2. 开头 3 行：是否在 2 秒内给出痛点、结果、反差或目标人群？有没有慢铺垫？
3. 真实证据感：正文是否有真实使用场景、具体细节、使用时长/频次/反应等可验证信息？
4. 轻微缺点与适用边界：是否写出一个可信的小缺点、适合/不适合人群，避免全篇硬广？
5. 卖点具体度：是否把卖点落到场景、动作、感受、结果，而不是只写“好用、绝了、必买”？
6. 段落与手机阅读：是否短段落、2-3 行一段、重点清晰、emoji 使用克制？
7. 互动设计：结尾是否有评论提问、投票、选择题或情绪共鸣？
8. 标签策略：是否覆盖话题、品类、人群、场景；是否过泛或堆砌？
9. 封面一致性：标题、封面文案和正文主卖点是否一致，首图是否有可视化方向？
10. 违规词/限流风险：严查医疗词、绝对化用词、夸张承诺、诱导私下交易等。
11. SEO 埋点：核心关键词是否自然融入，不像关键词堆砌？
12. 当前图文规则：是否符合工具里配置的小红书图文规则。

${getXiaohongshuGraphicRules()}

要求：
1. 每一项都要给出明确 status：good（优秀）、watch（建议微调）、fix（必须修改）。
2. checks 至少返回 8 项，必须覆盖标题、前三行、证据感、轻微缺点、适用边界、互动、标签、违规风险。
3. advice 必须毒舌且精准，直接告诉创作者哪里“太AI了”或“太硬广了”，并给出改写范例。
4. 如果你在检查中发现了任何 status 为 "fix" 或 "watch" 的问题，请在 optimizedContent 字段中提供一份“修正/优化后的完整版本”。
   - 替换掉所有违规词（如将“第一”改为“天花板级别”）。
   - 优化标题的钩子。
   - 调整正文开头的节奏。
   - 补足真实场景、具体细节、轻微缺点、适用边界和互动结尾。
   - 确保 optimizedContent 里的 title 和 body 是完整的文案，可以直接覆盖原内容。
5. overallSuggestion 用 1-2 句话总结这条内容现在的爆文潜质评分（1-10分）。
6. 只输出 JSON。
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

function getXiaohongshuAnalysisPrompt() {
  return `
你是资深小红书电商内容创作者和爆文拆解教练。你要把一条提取来的小红书图文，拆成可复用的创作公式。

分析重点：
1. 标题为什么让人点开：钩子类型、关键词、情绪和利益点。
2. 开头为什么留人：前 50 字用了什么冲突、痛点、结果或真实经历。
3. 正文结构：按段落拆解每一段承担的流量/信任/转化作用。
4. 电商转化点：它如何把产品、场景、痛点、信任感接起来。
5. 互动设计：评论区可能被什么问题或槽点触发。
6. 图片策略：基于图片数量和正文推断封面/多图排序的作用；如果没有足够图片信息，不要编造具体画面，只给可验证的策略判断。
7. 可迁移公式：输出可以套到其他产品上的清晰模板。
8. 参考价值评分：标题吸引力、正文结构、种草强度、互动设计、转化潜力，每项 0-100 分并说明原因。
9. 风险：指出不应该照搬、可能硬广、可能违规或版权风险的部分。

要求：
1. 用中文输出。
2. 不要复述原文，要解释它为什么有效。
3. 每个字段必须具体、可执行，避免空泛词。
4. 禁止输出空字符串、空数组或“未识别”。如果原文信息有限，也要基于标题、正文、图片数量给出可验证的拆解判断。
5. titleFormula 输出“人群/场景 + 痛点/反差 + 结果/收益”这类可复用公式；openingHook 输出前三行留人的具体写法；bodyFormula 输出正文段落公式。
6. visualPlan 至少按图片数量给 1-6 条图片顺序建议；missingVisuals 至少 2 条缺图提醒。
7. transferableMoves 至少 4 条，doNotReuse 至少 3 条，valueScores 必须包含“标题吸引力、正文结构、种草强度、互动设计、转化潜力”五项。
8. contentStructure 至少 4 条，sellingPoints 至少 3 条，emotionTriggers 至少 3 条，interactionHooks 至少 2 条，visualNotes 至少 2 条，riskNotes 至少 2 条，replaceableVariables 至少 4 条，forbiddenRisks 至少 2 条。
9. 只输出 JSON。
`;
}

export async function runXiaohongshuAnalysis({
  title,
  text,
  imageCount,
  tags
}: {
  title: string;
  text: string;
  imageCount: number;
  tags?: string | null;
}) {
  const client = getClient();
  const payload = JSON.stringify(
    {
      title,
      text: text.slice(0, 8000),
      imageCount,
      tags,
      requiredOutputKeys: [
        "summary",
        "hookType",
        "titleAnalysis",
        "openingAnalysis",
        "titleFormula",
        "openingHook",
        "bodyFormula",
        "contentStructure",
        "sellingPoints",
        "emotionTriggers",
        "interactionHooks",
        "visualNotes",
        "visualPlan",
        "missingVisuals",
        "riskNotes",
        "valueScores",
        "transferableMoves",
        "doNotReuse",
        "reusableFormula",
        "rewriteBrief"
      ]
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
          content: `${getXiaohongshuAnalysisPrompt()}\n${getJsonInstruction("xiaohongshu_analysis_response")}`
        },
        { role: "user", content: payload }
      ],
      response_format: { type: "json_object" }
    });

    return parseOutput<XiaohongshuAnalysisOutput>(response.choices[0]?.message?.content ?? "");
  }

  const response = await client.responses.create({
    model: getModel(),
    input: [
      {
        role: "system",
        content: getXiaohongshuAnalysisPrompt()
      },
      {
        role: "user",
        content: payload
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "xiaohongshu_analysis_response",
        schema: xiaohongshuAnalysisSchema,
        strict: true
      }
    }
  });

  return parseOutput<XiaohongshuAnalysisOutput>(response.output_text);
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

export async function runChatConversation({
  messages
}: {
  messages: Pick<ChatMessageView, "role" | "content">[];
}) {
  const client = getClient();
  const safeMessages = messages
    .filter((message) => message.content.trim())
    .slice(-20)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" as const : "user" as const,
      content: message.content
    }));

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: "system",
        content:
          "你是一个资深小红书电商内容创作助手。你可以陪用户讨论选题、标题、正文、图片顺序、发布风险和内容优化。回答要直接、具体、可执行，不要假装能看到未提供的数据。"
      },
      ...safeMessages
    ]
  });

  return response.choices[0]?.message?.content?.trim() || "我没有生成有效回复，请换个问法再试一次。";
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

  const image = response.data?.[0]?.b64_json;
  if (!image) {
    throw new Error("模型没有返回图片数据。");
  }

  return image;
}
