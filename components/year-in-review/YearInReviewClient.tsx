"use client";

import { useState, useEffect } from "react";
import { Share2, Loader2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { YearInReviewCard } from "./YearInReviewCard";
import type { YearInReview } from "@/lib/queries/year-in-review";

type ShareInfo = { url: string; slug: string };

type Props = {
  data: YearInReview;
};

export function YearInReviewClient({ data }: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isUnsharing, setIsUnsharing] = useState(false);

  // Check for existing snapshot on mount
  useEffect(() => {
    fetch(`/api/year-in-review/snapshot?year=${data.year}`)
      .then((r) => r.json())
      .then((json: { exists: boolean; slug?: string; url?: string }) => {
        if (json.exists && json.slug && json.url) {
          setShareInfo({ url: json.url, slug: json.slug });
        }
      })
      .catch(() => {});
  }, [data.year]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const res = await fetch("/api/year-in-review/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: data.year }),
      });
      if (!res.ok) throw new Error("Failed to create snapshot");
      const json = (await res.json()) as { slug: string; url: string };
      setShareInfo({ url: json.url, slug: json.slug });
      await navigator.clipboard.writeText(json.url);
      toast.success("Share link copied to clipboard!", {
        description: json.url,
        duration: 5000,
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not create share link. Try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!shareInfo) return;
    setIsUnsharing(true);
    try {
      const res = await fetch(
        `/api/year-in-review/snapshot/${shareInfo.slug}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove snapshot");
      setShareInfo(null);
      toast.success("Share link removed.");
    } catch (err) {
      console.error(err);
      toast.error("Could not remove share link. Try again.");
    } finally {
      setIsUnsharing(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareInfo) return;
    await navigator.clipboard.writeText(shareInfo.url);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      {/* Action controls */}
      <div className="mx-auto mb-6 max-w-2xl">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {isSharing ? "Creating link..." : shareInfo ? "Reshare" : "Share"}
          </button>
        </div>

        {shareInfo && (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={shareInfo.url}
              className="min-w-0 flex-1 rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#1f1f1f] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-white"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
            <button
              type="button"
              onClick={handleUnshare}
              disabled={isUnsharing}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs text-destructive transition-colors hover:border-destructive disabled:opacity-60"
            >
              {isUnsharing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Unshare
            </button>
          </div>
        )}
      </div>

      <YearInReviewCard data={data} />
    </div>
  );
}
