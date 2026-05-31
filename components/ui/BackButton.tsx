"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="fixed left-4 top-[60px] z-30 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/70"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}
