import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAssetView } from "@/lib/views";

export const runtime = "nodejs";

export async function GET() {
  const assets = await prisma.contentAsset.findMany({
    where: {
      source: { not: "xiaohongshu_import" }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({ assets: assets.map(toAssetView) });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, status, isFavorite, coverImage, coverText, title, body: assetBody } = body;

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const asset = await prisma.contentAsset.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(isFavorite !== undefined && { isFavorite }),
      ...(coverImage !== undefined && { coverImage }),
      ...(coverText !== undefined && { coverText }),
      ...(title !== undefined && { title }),
      ...(assetBody !== undefined && { body: assetBody })
    }
  });

  return NextResponse.json({ asset: toAssetView(asset) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ids = searchParams.get("ids")?.split(",");

  if (ids && ids.length > 0) {
    await prisma.contentAsset.deleteMany({
      where: { id: { in: ids } }
    });
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.contentAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
