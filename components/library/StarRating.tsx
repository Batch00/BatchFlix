"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

type StarFill = "full" | "half" | "empty";

// starPosition is 1-5. rating is the DB value (1-10, half-star increments).
export function getStarFill(starPosition: number, rating: number): StarFill {
  const displayRating = rating / 2;
  if (displayRating >= starPosition) return "full";
  if (displayRating >= starPosition - 0.5) return "half";
  return "empty";
}

function Star({
  fill,
  clipId,
  size = 20,
}: {
  fill: StarFill;
  clipId: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="flex-shrink-0"
    >
      {fill === "half" && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      <path
        d={STAR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-muted-foreground/40"
      />
      {fill !== "empty" && (
        <path
          d={STAR_PATH}
          fill="currentColor"
          className="text-primary"
          clipPath={fill === "half" ? `url(#${clipId})` : undefined}
        />
      )}
    </svg>
  );
}

type StarRatingProps =
  | {
      interactive: true;
      rating: number;
      onChange: (dbValue: number) => void;
      size?: number;
    }
  | {
      interactive?: false;
      rating: number;
      onChange?: never;
      size?: number;
    };

export function StarRating({
  interactive = false,
  rating,
  onChange,
  size = 20,
}: StarRatingProps) {
  const baseId = useId();
  const displayValue = rating / 2;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const starPosition = i + 1;
          const fill = getStarFill(starPosition, rating);
          const clipId = `${baseId}-star-${i}`;
          if (interactive && onChange) {
            return (
              <div key={i} className="relative">
                <Star fill={fill} clipId={clipId} size={size} />
                <button
                  type="button"
                  className={cn(
                    "absolute inset-0 w-1/2 cursor-pointer opacity-0",
                    "hover:opacity-100"
                  )}
                  onClick={() => onChange(i * 2 + 1)}
                  aria-label={`Rate ${i + 0.5} out of 5`}
                />
                <button
                  type="button"
                  className={cn(
                    "absolute inset-0 left-1/2 w-1/2 cursor-pointer opacity-0",
                    "hover:opacity-100"
                  )}
                  onClick={() => onChange((i + 1) * 2)}
                  aria-label={`Rate ${i + 1} out of 5`}
                />
              </div>
            );
          }
          return <Star key={i} fill={fill} clipId={clipId} size={size} />;
        })}
      </div>
      {rating > 0 && (
        <span className="text-xs text-muted-foreground">{displayValue}</span>
      )}
    </div>
  );
}
