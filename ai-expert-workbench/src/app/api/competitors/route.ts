import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCompetitorAnalysisView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.competitorAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ analyses: items.map(toCompetitorAnalysisView) });
}
