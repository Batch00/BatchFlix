import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const ALLOWED_PREFIXES = ["/search", "/movie", "/tv", "/person", "/collection", "/configuration"];
const NO_CACHE_PREFIXES = ["/search"];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  const path = "/" + segments.join("/");

  const isAllowed = ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const qs = searchParams.toString();
  const url = `${TMDB_BASE}${path}${qs ? `?${qs}` : ""}`;

  const tmdbRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const data = await tmdbRes.json();

  const isSearch = NO_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix));
  const headers: Record<string, string> = {};
  if (!isSearch) {
    headers["Cache-Control"] = "public, s-maxage=3600";
  }

  return NextResponse.json(data, { status: tmdbRes.status, headers });
}
