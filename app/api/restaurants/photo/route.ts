import { NextResponse } from "next/server";

const allowedHostPatterns = [
  /(^|\.)amap\.com$/i,
  /(^|\.)autonavi\.com$/i,
  /(^|\.)amapimg\.com$/i
];

function isAllowedAmapImageUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  return allowedHostPatterns.some((pattern) => pattern.test(url.hostname));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "MISSING_IMAGE_URL" }, { status: 400 });
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_IMAGE_URL" }, { status: 400 });
  }

  if (!isAllowedAmapImageUrl(imageUrl)) {
    return NextResponse.json({ ok: false, error: "IMAGE_HOST_NOT_ALLOWED" }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl.toString(), {
      cache: "force-cache",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ChishaMatch/3.0; +https://vercel.app)"
      },
      next: { revalidate: 60 * 60 * 24 * 7 }
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/restaurants/fallback.png", request.url));
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return NextResponse.redirect(new URL("/restaurants/fallback.png", request.url));
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400"
      }
    });
  } catch (error) {
    console.error("[RestaurantPhoto] proxy failed", {
      url: imageUrl.toString(),
      error
    });
    return NextResponse.redirect(new URL("/restaurants/fallback.png", request.url));
  }
}
