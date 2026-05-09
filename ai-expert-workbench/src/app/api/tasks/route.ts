import { NextResponse } from "next/server";
import { COORDINATOR_ROLE, EXPERT_ROLES } from "@/lib/experts";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_IDS } from "@/lib/public-config";
import { getModelConfigError, hasModelConfig, runCoordinator, runExpert } from "@/lib/openai";
import { toTaskView, upsertExpertRoles } from "@/lib/tasks";
import type { ExpertStructuredOutput } from "@/lib/types";

export const runtime = "nodejs";

type CreateTaskBody = {
  userInput?: string;
  selectedRoleIds?: string[];
};

export async function GET() {
  await upsertExpertRoles(prisma);

  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      runs: {
        orderBy: { createdAt: "asc" },
        include: { role: { select: { name: true } } }
      }
    }
  });

  return NextResponse.json({
    tasks: await Promise.all(tasks.map(toTaskView))
  });
}

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json(
      { error: getModelConfigError() },
      { status: 400 }
    );
  }

  const body = (await request.json()) as CreateTaskBody;
  const userInput = body.userInput?.trim();

  if (!userInput) {
    return NextResponse.json({ error: "请输入任务内容。" }, { status: 400 });
  }

  await upsertExpertRoles(prisma);

  const selectedIds =
    body.selectedRoleIds && body.selectedRoleIds.length > 0
      ? body.selectedRoleIds
      : DEFAULT_ROLE_IDS;
  const selectableRoles = EXPERT_ROLES.filter((role) => role.selectable && role.enabled);
  const selectedRoles = selectableRoles.filter((role) => selectedIds.includes(role.id));

  if (selectedRoles.length === 0) {
    return NextResponse.json({ error: "请至少选择一个专家角色。" }, { status: 400 });
  }

  const title = userInput.length > 28 ? `${userInput.slice(0, 28)}...` : userInput;
  const task = await prisma.task.create({
    data: {
      title,
      userInput,
      selectedRoleIds: JSON.stringify(selectedRoles.map((role) => role.id))
    }
  });

  const expertRuns = await Promise.all(
    selectedRoles.map(async (role) => {
      try {
        const output = await runExpert(role, userInput);
        return prisma.expertRun.create({
          data: {
            taskId: task.id,
            roleId: role.id,
            output: JSON.stringify(output),
            status: "success"
          },
          include: { role: { select: { name: true } } }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "专家调用失败。";
        return prisma.expertRun.create({
          data: {
            taskId: task.id,
            roleId: role.id,
            status: "failed",
            error: message
          },
          include: { role: { select: { name: true } } }
        });
      }
    })
  );

  const successfulOutputs = expertRuns
    .filter((run) => run.status === "success" && run.output)
    .map((run) => ({
      roleName: run.role.name,
      output: JSON.parse(run.output as string) as ExpertStructuredOutput
    }));

  let finalSummary = "没有可用的专家输出，请检查 OpenAI 配置或稍后重试。";

  if (successfulOutputs.length > 0) {
    try {
      const coordinatorOutput = await runCoordinator(COORDINATOR_ROLE, userInput, successfulOutputs);
      finalSummary = [
        `# ${coordinatorOutput.title}`,
        "",
        coordinatorOutput.finalPlanMarkdown,
        "",
        "## 下一步动作",
        ...coordinatorOutput.nextActions.map((item, index) => `${index + 1}. ${item}`)
      ].join("\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : "总控汇总失败。";
      finalSummary = [
        "# 总控汇总失败",
        "",
        `汇总错误：${message}`,
        "",
        "## 可用专家建议",
        ...successfulOutputs.map((item) => `- ${item.roleName}：${item.output.summary}`)
      ].join("\n");
    }
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { finalSummary }
  });

  const savedTask = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
    include: {
      runs: {
        orderBy: { createdAt: "asc" },
        include: { role: { select: { name: true } } }
      }
    }
  });

  return NextResponse.json({ task: await toTaskView(savedTask) });
}
