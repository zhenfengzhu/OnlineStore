import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toXiaohongshuExtractionView } from "@/lib/views";

export const runtime = "nodejs";

type ExtractedNote = {
  title: string;
  text: string;
  topics: string[];
  images: string[];
  sourceUrl: string;
  finalUrl: string;
};

const allowedHosts = [
  "xiaohongshu.com",
  "xhslink.com",
  "xhsurl.com"
];

function isAllowedUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value.replaceAll('"', '\\"')}"`) as string;
  } catch {
    return value;
  }
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  return decodeHtml(value)
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "";
}

function extractTitle(html: string) {
  const metaTitle = getMeta(html, "og:title") || getMeta(html, "twitter:title");
  if (metaTitle) return metaTitle;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanText(title);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function normalizeImageUrl(rawUrl: string) {
  const cleaned = decodeHtml(rawUrl)
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .split(/(?:;|&quot;|&#34;|&amp;quot;|background-|repeat:|position:|size:)/i)[0]
    .replace(/[)\].,，。;；]+$/g, "")
    .trim();

  try {
    const url = new URL(cleaned);
    url.hash = "";
    return url.toString();
  } catch {
    return cleaned;
  }
}

function isLikelyNoteImageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();

    if (/sns-video|sns-avatar/i.test(hostname)) return false;
    if (url.pathname === "/" || url.pathname.length < 8) return false;

    return (
      /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url.pathname + url.search) ||
      /imageView2|format=(?:jpg|jpeg|png|webp)|sns-webpic|sns-img|notes_pre_post/i.test(url.href)
    );
  } catch {
    return false;
  }
}

function extractImages(html: string) {
  const images = [
    getMeta(html, "og:image"),
    getMeta(html, "twitter:image")
  ].filter(isLikelyNoteImageUrl);

  const urlPattern = /https?:\\?\/\\?\/[^"'<>\\\s]+?(?:xhscdn\.com|xiaohongshu\.com|sns-webpic|sns-img)[^"'<>\\\s]*/gi;
  for (const match of html.matchAll(urlPattern)) {
    const imageUrl = normalizeImageUrl(match[0]);
    if (isLikelyNoteImageUrl(imageUrl)) {
      images.push(imageUrl);
    }
  }

  return unique(images.map(normalizeImageUrl)).slice(0, 30);
}

function extractText(html: string) {
  const description = getMeta(html, "description") || getMeta(html, "og:description") || getMeta(html, "twitter:description");
  const candidates = [description];

  const jsonTextPatterns = [
    /"desc"\s*:\s*"((?:\\"|[^"])*)"/gi,
    /"content"\s*:\s*"((?:\\"|[^"])*)"/gi,
    /"noteText"\s*:\s*"((?:\\"|[^"])*)"/gi
  ];

  for (const pattern of jsonTextPatterns) {
    for (const match of html.matchAll(pattern)) {
      const decoded = cleanText(decodeJsonString(match[1]));
      if (decoded.length > 20) candidates.push(decoded);
    }
  }

  return unique(candidates.filter(Boolean)).sort((a, b) => b.length - a.length)[0] ?? "";
}

function splitTopicsFromText(value: string) {
  const topics: string[] = [];
  const text = value.replace(/#\s*([^#[\]\s][^#\[]*?)\s*(?:\[话题\])?#/g, (_match, topic: string) => {
    const cleanTopic = String(topic).trim();
    if (cleanTopic) topics.push(cleanTopic);
    return " ";
  }).replace(/\s{2,}/g, " ").trim();

  return {
    text,
    topics: unique(topics)
  };
}

async function fetchPublicPage(url: string) {
  return fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
  });
}

function parseLegacyAssetBody(body: string) {
  const sourceUrl = body.match(/来源链接：(.+)/)?.[1]?.trim() ?? "";
  const finalUrl = body.match(/解析后链接：(.+)/)?.[1]?.trim() ?? sourceUrl;
  const text = body.match(/## 原文\s+([\s\S]*?)(?=\n## 图片|$)/)?.[1]?.trim() ?? body;
  const split = splitTopicsFromText(text);
  const images = unique(
    (body.match(/https?:\/\/[^\s<>"']+/g) ?? [])
      .map(normalizeImageUrl)
      .filter(isLikelyNoteImageUrl)
  );

  return { sourceUrl, finalUrl, text: split.text, topics: split.topics, images };
}

async function migrateLegacyExtractions() {
  const legacyAssets = await prisma.contentAsset.findMany({
    where: { source: "xiaohongshu_import" },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  for (const asset of legacyAssets) {
    const legacy = parseLegacyAssetBody(asset.body);
    const sourceUrl = legacy.sourceUrl || `legacy:${asset.id}`;
    const existing = await prisma.xiaohongshuExtraction.findFirst({ where: { sourceUrl } });
    if (existing) continue;

    await prisma.xiaohongshuExtraction.create({
      data: {
        title: asset.title,
        text: legacy.text,
        topicsJson: JSON.stringify(legacy.topics),
        imagesJson: JSON.stringify(legacy.images),
        tags: asset.tags,
        isFavorite: asset.isFavorite,
        sourceUrl,
        finalUrl: legacy.finalUrl || sourceUrl,
        createdAt: asset.createdAt
      }
    });
  }
}

export async function GET() {
  await migrateLegacyExtractions();

  const extractions = await prisma.xiaohongshuExtraction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return NextResponse.json({ extractions: extractions.map(toXiaohongshuExtractionView) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  const sourceUrl = body.url?.trim();

  if (!sourceUrl || !isAllowedUrl(sourceUrl)) {
    return NextResponse.json({ error: "请输入有效的小红书或 xhslink 分享链接。" }, { status: 400 });
  }

  const response = await fetchPublicPage(sourceUrl);
  if (!response.ok) {
    return NextResponse.json(
      { error: `链接读取失败，当前返回 ${response.status}。请确认链接可公开访问。` },
      { status: 400 }
    );
  }

  const html = await response.text();
  const extractedText = extractText(html);
  const splitText = splitTopicsFromText(extractedText);
  const note: ExtractedNote = {
    title: extractTitle(html) || "小红书笔记素材",
    text: splitText.text,
    topics: splitText.topics,
    images: extractImages(html),
    sourceUrl,
    finalUrl: response.url || sourceUrl
  };

  if (!note.text && note.images.length === 0) {
    return NextResponse.json(
      { error: "未能提取到正文或图片。该链接可能需要登录、已失效，或页面限制了公开访问。" },
      { status: 422 }
    );
  }

  const extraction = await prisma.xiaohongshuExtraction.create({
    data: {
      title: note.title,
      text: note.text,
      topicsJson: JSON.stringify(note.topics),
      imagesJson: JSON.stringify(note.images),
      tags: null,
      sourceUrl: note.sourceUrl,
      finalUrl: note.finalUrl
    }
  });

  return NextResponse.json({
    extraction: toXiaohongshuExtractionView(extraction),
    extracted: note
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    tags?: string | null;
    isFavorite?: boolean;
  };

  if (!body.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const extraction = await prisma.xiaohongshuExtraction.update({
    where: { id: body.id },
    data: {
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite })
    }
  });

  return NextResponse.json({ extraction: toXiaohongshuExtractionView(extraction) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.xiaohongshuExtraction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
