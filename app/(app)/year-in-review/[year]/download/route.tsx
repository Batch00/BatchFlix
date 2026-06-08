import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getYearInReview } from "@/lib/queries/year-in-review";

export const runtime = "nodejs";

type Params = { year: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return new Response("Invalid year", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await getYearInReview(supabase, user.id, year);

  if (data.totalItems === 0) {
    return new Response("No data for this year", { status: 404 });
  }

  const avgDisplay =
    data.avgRating !== null ? `${data.avgRating.toFixed(1)}★` : "--";
  const topGenreMax = data.topGenres[0]?.count ?? 1;

  const muted = "#71717a";
  const blue = "#2563EB";
  const dark = "#0a0a0a";
  const card = "#111111";
  const border = "#1f1f1f";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: dark,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Card */}
        <div
          style={{
            backgroundColor: card,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: border,
            borderRadius: 24,
            padding: "48px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: blue,
                  lineHeight: 1,
                }}
              >
                {data.year}
              </span>
              <span
                style={{
                  fontSize: 18,
                  color: "#ffffff",
                  letterSpacing: 8,
                  marginTop: -8,
                }}
              >
                YEAR IN REVIEW
              </span>
            </div>
            <span style={{ fontSize: 12, color: muted, marginTop: 8 }}>
              BatchFlix
            </span>
          </div>

          {/* Big 3 numbers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1,
                }}
              >
                {data.totalItems}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: muted,
                  letterSpacing: 2,
                  marginTop: 6,
                  textTransform: "uppercase",
                }}
              >
                films & shows
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: blue,
                  lineHeight: 1,
                }}
              >
                {data.totalHours}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: muted,
                  letterSpacing: 2,
                  marginTop: 6,
                  textTransform: "uppercase",
                }}
              >
                hours
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1,
                }}
              >
                {avgDisplay}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: muted,
                  letterSpacing: 2,
                  marginTop: 6,
                  textTransform: "uppercase",
                }}
              >
                avg rating
              </span>
            </div>
          </div>

          {/* Two columns: genre + month */}
          <div
            style={{
              display: "flex",
              marginBottom: 32,
            }}
          >
            {/* Top genre */}
            <div
              style={{
                flex: 1,
                backgroundColor: dark,
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                marginRight: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: muted,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Top Genre
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1,
                  marginBottom: 12,
                }}
              >
                {data.topGenre ?? "--"}
              </span>
              {data.topGenres.slice(0, 3).map((g, i) => (
                <div
                  key={g.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      height: 4,
                      width: Math.round((g.count / topGenreMax) * 160),
                      backgroundColor: i === 0 ? blue : border,
                      borderRadius: 2,
                      marginRight: 8,
                    }}
                  />
                  <span style={{ fontSize: 10, color: muted }}>{g.name}</span>
                </div>
              ))}
            </div>

            {/* Best month */}
            <div
              style={{
                flex: 1,
                backgroundColor: dark,
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                marginLeft: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: muted,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Best Month
              </span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {data.bestMonth?.month ?? "--"}
              </span>
              {data.bestMonth && (
                <span style={{ fontSize: 12, color: muted }}>
                  {data.bestMonth.count} films & shows
                </span>
              )}
            </div>
          </div>

          {/* Director spotlight */}
          {data.mostWatchedDirector && (
            <div
              style={{
                backgroundColor: dark,
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: muted,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Director of the Year
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 2,
                }}
              >
                {data.mostWatchedDirector.name}
              </span>
              <span style={{ fontSize: 12, color: muted }}>
                {data.mostWatchedDirector.count} films watched
              </span>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: border,
              paddingTop: 16,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 12, color: muted }}>
              Tracked on BatchFlix &middot; batchflix.batch-apps.com
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
