import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskView, upsertExpertRoles } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  await upsertExpertRoles(prisma);

  const { id } = await context.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { createdAt: "asc" },
        include: { role: { select: { name: true } } }
      }
    }
  });

  if (!task) {
    return NextResponse.json({ error: "没有找到该任务。" }, { status: 404 });
  }

  return NextResponse.json({ task: await toTaskView(task) });
}
