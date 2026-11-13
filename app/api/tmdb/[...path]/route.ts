import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const ALLOWED_ROOTS = ["search", "movie", "tv", "person", "collection", "configuration", "trending", "keyword", "discover"];
const NO_CACHE_ROOTS = ["search"];
const LONG_CACHE_ROOTS = ["person", "collection"];

// Next passes catch-all segments already decoded, so any "%" left in a
// segment means it was double encoded and is rejected along with the rest.
function isValidSegment(segment: string): boolean {
  return segment !== "" && segment !== "." && segment !== ".." && !/[/\\%]/.test(segment);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;

  if (!segments.every(isValidSegment)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const root = segments[0];
  if (!ALLOWED_ROOTS.includes(root)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const qs = searchParams.toString();
  const path = "/" + segments.map(encodeURIComponent).join("/");
  const url = `${TMDB_BASE}${path}${qs ? `?${qs}` : ""}`;

  const tmdbRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const data = await tmdbRes.json();

  const headers: Record<string, string> = {};
  // Public CDN caching is acceptable even though the route needs a session:
  // a cache hit served without a session only returns public movie metadata
  // that was already fetched, and never spends the TMDB token. Upstream
  // errors are never cached.
  if (tmdbRes.ok && !NO_CACHE_ROOTS.includes(root)) {
    // Person and collection data is effectively immutable; everything else
    // (season episode lists, detail lookups) gets the standard hour.
    const longLived = LONG_CACHE_ROOTS.includes(root);
    headers["Cache-Control"] = `public, s-maxage=${longLived ? 86400 : 3600}`;
  }

  return NextResponse.json(data, { status: tmdbRes.status, headers });
}
