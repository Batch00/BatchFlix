import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = 512;
const ICON = SIZE * 0.55;
const STROKE = SIZE * 0.04;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: SIZE * 0.2,
        }}
      >
        <svg
          width={ICON}
          height={ICON}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2563EB"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12.296 3.464 3.02 3.956" />
          <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />
          <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="m6.18 5.276 3.1 3.899" />
        </svg>
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
