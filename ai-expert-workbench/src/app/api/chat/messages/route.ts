import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runChatConversation } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { ChatMessageView } from "@/lib/types";
import { toChatSessionView } from "@/lib/views";

export const runtime = "nodejs";

function getSessionTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 24 ? `${clean.slice(0, 24)}...` : clean || "新的 AI 聊天";
}

function getChatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

  if (status === 401 || status === 403 || /\b(401|403)\b/.test(message)) {
    return "模型接口拒绝了这次聊天请求，请检查模型设置里的 API Key、账号权限或余额。";
  }

  if (/rate limit|429|quota|insufficient/i.test(message)) {
    return "模型接口额度或频率受限，请稍后重试，或检查模型供应商余额。";
  }

  return message || "AI 聊天失败，请重试。";
}

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json({ error: getModelConfigError() }, { status: 400 });
  }

  const body = (await request.json()) as { sessionId?: string; content?: string };
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "请输入要发送的内容。" }, { status: 400 });
  }

  try {
    const session = body.sessionId
      ? await prisma.chatSession.findUnique({
          where: { id: body.sessionId },
          include: { messages: { orderBy: { createdAt: "asc" } } }
        })
      : await prisma.chatSession.create({
          data: { title: getSessionTitle(content) },
          include: { messages: true }
        });

    if (!session) {
      return NextResponse.json({ error: "未找到聊天会话。" }, { status: 404 });
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content
      }
    });

    const historyMessages: Pick<ChatMessageView, "role" | "content">[] = session.messages.map((message) => ({
      role: message.role === "assistant" || message.role === "system" ? message.role : "user",
      content: message.content
    }));

    const assistantContent = await runChatConversation({
      messages: [
        ...historyMessages,
        { role: "user", content: userMessage.content }
      ]
    });

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: assistantContent
      }
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        title: session.messages.length === 0 ? getSessionTitle(content) : session.title
      }
    });

    const updated = await prisma.chatSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ session: toChatSessionView(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: getChatErrorMessage(error) },
      { status: 502 }
    );
  }
}
