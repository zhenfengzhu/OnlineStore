import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const noteText = `作者：${body.author || '未知'}
链接：${body.url}

【标题】
${body.title}

【正文】
${body.content}

【数据】
点赞：${body.likes}，收藏：${body.collects}，评论：${body.comments}`;

    const analysis = await prisma.competitorAnalysis.create({
      data: {
        title: `[采集] ${body.title || '未知笔记'}`,
        competitorName: body.author,
        price: null,
        noteText: noteText,
        sellingPoints: null,
        userQuestions: null,
        weakness: null,
        opportunities: null,
        coverAnalysis: null,
        hotComments: body.hotComments,
        result: `这是通过插件自动抓取的笔记数据。你可以基于这篇笔记的文本，在工作流中针对该文本要求 AI 进行深入拆解。`
      }
    });

    return NextResponse.json({ success: true, analysis }, { headers: corsHeaders });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "导入失败" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
