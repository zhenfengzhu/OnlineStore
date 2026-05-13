import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toChatSessionView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return NextResponse.json({ sessions: sessions.map(toChatSessionView) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = body.title?.trim() || "新的 AI 聊天";

  const session = await prisma.chatSession.create({
    data: { title },
    include: { messages: true }
  });

  return NextResponse.json({ session: toChatSessionView(session) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
