import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCalendarItemView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.calendarItem.findMany({
    orderBy: [{ createdAt: "desc" }, { day: "asc" }],
    take: 200,
    include: { product: { select: { name: true } } }
  });

  return NextResponse.json({ items: items.map(toCalendarItemView) });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    status?: string;
    publishAt?: string;
    noteUrl?: string;
    metrics?: string;
    reviewNote?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "缺少日历条目 ID。" }, { status: 400 });
  }

  const item = await prisma.calendarItem.update({
    where: { id: body.id },
    data: {
      status: body.status?.trim() || undefined,
      publishAt: body.publishAt?.trim() || null,
      noteUrl: body.noteUrl?.trim() || null,
      metrics: body.metrics?.trim() || null,
      reviewNote: body.reviewNote?.trim() || null
    },
    include: { product: { select: { name: true } } }
  });

  return NextResponse.json({ item: toCalendarItemView(item) });
}
