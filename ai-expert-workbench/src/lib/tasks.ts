import type { ExpertRun, Task } from "@prisma/client";
import { EXPERT_ROLES } from "@/lib/experts";
import type { ExpertRunView, ExpertStructuredOutput, TaskView } from "@/lib/types";

export async function safeJsonParse<T>(value: string | null): Promise<T | null> {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function toTaskView(
  task: Task & {
    runs: Array<ExpertRun & { role: { name: string } }>;
  }
): Promise<TaskView> {
  const runs: ExpertRunView[] = await Promise.all(
    task.runs.map(async (run) => ({
      id: run.id,
      roleId: run.roleId,
      roleName: run.role.name,
      status: run.status,
      output: await safeJsonParse<ExpertStructuredOutput>(run.output),
      error: run.error,
      createdAt: run.createdAt.toISOString()
    }))
  );

  return {
    id: task.id,
    title: task.title,
    userInput: task.userInput,
    selectedRoleIds: await safeJsonParse<string[]>(task.selectedRoleIds).then((ids) => ids ?? []),
    finalSummary: task.finalSummary,
    workflowType: task.workflowType,
    productId: task.productId,
    createdAt: task.createdAt.toISOString(),
    runs
  };
}

export async function upsertExpertRoles(prismaClient: {
  expertRole: {
    upsert: (args: {
      where: { id: string };
      update: { name: string; description: string; systemPrompt: string; enabled: boolean };
      create: {
        id: string;
        name: string;
        description: string;
        systemPrompt: string;
        enabled: boolean;
      };
    }) => Promise<unknown>;
  };
}) {
  await Promise.all(
    EXPERT_ROLES.map((role) =>
      prismaClient.expertRole.upsert({
        where: { id: role.id },
        update: {
          name: role.name,
          description: role.description,
          systemPrompt: role.systemPrompt,
          enabled: role.enabled
        },
        create: {
          id: role.id,
          name: role.name,
          description: role.description,
          systemPrompt: role.systemPrompt,
          enabled: role.enabled
        }
      })
    )
  );
}
