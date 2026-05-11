import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runWorkflow, runExpertSkill } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { WorkflowOutput, WorkflowType } from "@/lib/types";

export const runtime = "nodejs";

const workflowTypes: WorkflowType[] = ["thirty_notes", "content_calendar", "video_scripts", "inspiration_rewrite"];

type WorkflowBody = {
  type?: WorkflowType;
  userInput?: string;
};

function noteToMarkdown(note: WorkflowOutput["notes"][number]) {
  return [
    `# ${note.title}`,
    "",
    `📸 封面视觉建议：${note.visualSuggestion}`,
    "",
    `📝 封面文案：${note.coverText}`,
    "",
    note.body,
    "",
    `🏷️ 标签：${note.tags.join(" ")}`,
    "",
    `🎬 拍摄建议：${note.shootingSuggestion}`,
    "",
    `💬 首评策略（Variant 1 - 补充信息）：${note.firstCommentVariants[0] || ""}`,
    `💬 首评策略（Variant 2 - 互动钩子）：${note.firstCommentVariants[1] || ""}`,
    `💬 首评策略（Variant 3 - 真实感）：${note.firstCommentVariants[2] || ""}`,
    "",
    "🔥 互动问答脚本：",
    ...note.interactionScripts.map(script => `- [${script.scenario}] 用户：${script.userQuery} -> AI回复：${script.aiReply}`),
    "",
    `👥 适合人群：${note.targetAudience}`,
    "",
    `⚠️ 风险提醒：${note.riskTip}`
  ].join("\n");
}

function scriptToMarkdown(script: WorkflowOutput["scripts"][number]) {
  return [
    `# ${script.title}`,
    "",
    `🪝 开头钩子：${script.hook}`,
    "",
    "🎥 镜头说明：",
    ...script.shots.map((shot, index) => `${index + 1}. ${shot}`),
    "",
    `🎤 口播：${script.voiceover}`,
    "",
    `🔄 互动钩子：${script.interactionHook}`,
    "",
    `🔚 结尾引导：${script.ending}`
  ].join("\n");
}

async function persistWorkflowOutput(type: WorkflowType, output: WorkflowOutput) {
  const createdAssets = [];

  for (const note of output.notes) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          type: "note",
          title: note.title,
          body: noteToMarkdown(note),
          tags: note.tags.join(" "),
          coverText: note.coverText,
          source: type
        }
      })
    );
  }

  for (const script of output.scripts) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          type: "video_script",
          title: script.title,
          body: scriptToMarkdown(script),
          source: type
        }
      })
    );
  }

  const createdCalendarItems = await Promise.all(
    output.calendar.map((item) =>
      prisma.calendarItem.create({
        data: {
          day: item.day,
          topic: item.topic,
          format: item.format,
          angle: item.angle,
          assetTitle: item.assetTitle,
          goal: item.goal ?? null
        }
      })
    )
  );

  return {
    assetCount: createdAssets.length,
    calendarCount: createdCalendarItems.length
  };
}

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as WorkflowBody & { type: string };
  const type = body.type;

  if (type === "expert_skill") {
    const userInput = body.userInput?.trim();
    if (!userInput) return NextResponse.json({ error: "请输入专家指令。" }, { status: 400 });
    const result = await runExpertSkill({ userInput });
    return NextResponse.json(result);
  }

  if (!type || !workflowTypes.includes(type as WorkflowType)) {
    return NextResponse.json({ error: "未知工作流类型。" }, { status: 400 });
  }

  const userInput = body.userInput?.trim();
  if (!userInput) {
    return NextResponse.json({ error: "请输入创作说明。" }, { status: 400 });
  }

  const output = await runWorkflow({ type: type as WorkflowType, userInput });
  const persistence = await persistWorkflowOutput(type as WorkflowType, output);

  return NextResponse.json({ output, persistence });
}
