import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAssetView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const assets = await prisma.contentAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { name: true } } }
  });

  return NextResponse.json({ assets: assets.map(toAssetView) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.contentAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
