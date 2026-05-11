import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAssetView } from "@/lib/views";

export const runtime = "nodejs";

function parseAssetMeta(value: string | null) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanExternalImageCandidate(value: string) {
  const cleaned = value
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .trim();

  if (/^data:image\/[a-zA-Z+.-]+;base64,/i.test(cleaned)) {
    return cleaned;
  }

  return cleaned
    .split(/(?:;|&quot;|&#34;|&amp;quot;|background-|repeat:|position:|size:)/i)[0]
    .replace(/[)\].,，。;；]+$/g, "")
    .trim();
}

function isSupportedExternalImageUrl(value: string) {
  if (value.startsWith("data:image/")) {
    return /^data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+$/i.test(value);
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!url.hostname) return false;
    if (url.pathname === "/" && !url.search) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeExternalImages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? cleanExternalImageCandidate(item) : ""))
        .filter(isSupportedExternalImageUrl)
    )
  );
}

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
  const { id, status, isFavorite, coverImage, coverText, title, body: assetBody, externalImages } = body;

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  const currentAsset = externalImages !== undefined
    ? await prisma.contentAsset.findUnique({ where: { id } })
    : null;
  const contentMetaJson = externalImages !== undefined
    ? JSON.stringify({
        ...parseAssetMeta(currentAsset?.contentMetaJson ?? null),
        externalImages: normalizeExternalImages(externalImages)
      })
    : undefined;

  const asset = await prisma.contentAsset.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(isFavorite !== undefined && { isFavorite }),
      ...(coverImage !== undefined && { coverImage }),
      ...(coverText !== undefined && { coverText }),
      ...(title !== undefined && { title }),
      ...(assetBody !== undefined && { body: assetBody }),
      ...(contentMetaJson !== undefined && { contentMetaJson })
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
