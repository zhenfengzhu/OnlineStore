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

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.dataReview.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
