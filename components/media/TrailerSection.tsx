"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TMDBVideo } from "@/lib/tmdb";

type Props = {
  videos: TMDBVideo[];
};

function selectTrailer(videos: TMDBVideo[]): TMDBVideo | null {
  const yt = videos.filter((v) => v.site === "YouTube");
  return (
    yt.find((v) => v.type === "Trailer" && v.official) ??
    yt.find((v) => v.type === "Trailer") ??
    yt.find((v) => v.type === "Teaser") ??
    null
  );
}

export function TrailerSection({ videos }: Props) {
  const [open, setOpen] = useState(false);
  const trailer = selectTrailer(videos);
  if (!trailer) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Play className="h-4 w-4 fill-current" />
        Watch Trailer
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">{trailer.name}</DialogTitle>
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
              title={trailer.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
