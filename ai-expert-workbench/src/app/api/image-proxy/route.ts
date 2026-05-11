import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedImageHosts = [
  "xhscdn.com",
  "xiaohongshu.com"
];

function isLikelyImageUrl(url: URL) {
  if (/sns-video|sns-avatar/i.test(url.hostname)) return false;
  if (url.pathname === "/" || url.pathname.length < 8) return false;

  return (
    /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url.pathname + url.search) ||
    /imageView2|format=(?:jpg|jpeg|png|webp)|sns-webpic|sns-img|notes_pre_post/i.test(url.href)
  );
}

function getAllowedImageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const allowedHost = allowedImageHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (!allowedHost || !isLikelyImageUrl(url)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url")?.trim();
  const allowedUrl = imageUrl ? getAllowedImageUrl(imageUrl) : null;

  if (!allowedUrl) {
    return NextResponse.json({ error: "不支持的图片地址。" }, { status: 400 });
  }

  const response = await fetch(allowedUrl.toString(), {
    cache: "no-store",
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      referer: "https://www.xiaohongshu.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
  });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: `图片读取失败，当前返回 ${response.status}。` },
      { status: response.status || 502 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
  headers.set("Cache-Control", "public, max-age=3600");

  return new Response(response.body, { headers });
}
