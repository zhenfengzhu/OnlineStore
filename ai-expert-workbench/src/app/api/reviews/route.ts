import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDataReviewView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.dataReview.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ reviews: items.map(toDataReviewView) });
}
