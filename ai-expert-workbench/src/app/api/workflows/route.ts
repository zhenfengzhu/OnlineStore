import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runWorkflow, runExpertSkill } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { WorkflowOutput, WorkflowType } from "@/lib/types";

export const runtime = "nodejs";

const workflowTypes: WorkflowType[] = ["thirty_notes", "content_calendar", "video_scripts", "inspiration_rewrite"];

type WorkflowBody = {
  type?: WorkflowType | "expert_skill";
  userInput?: string;
};

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
          body: note.body,
          tags: note.tags.join(" "),
          coverText: note.coverText,
          contentMetaJson: JSON.stringify({
            visualSuggestion: note.visualSuggestion,
            shootingSuggestion: note.shootingSuggestion,
            firstCommentVariants: note.firstCommentVariants,
            interactionScripts: note.interactionScripts,
            targetAudience: note.targetAudience,
            riskTip: note.riskTip
          }),
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

  const body = (await request.json()) as WorkflowBody;
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

  try {
    const output = await runWorkflow({ type: type as WorkflowType, userInput });
    const persistence = await persistWorkflowOutput(type as WorkflowType, output);

    return NextResponse.json({ output, persistence });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "内容生成失败，请重试。" },
      { status: 502 }
    );
  }
}
