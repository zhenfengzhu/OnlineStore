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
