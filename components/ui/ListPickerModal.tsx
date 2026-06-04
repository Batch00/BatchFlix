"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ListWithCount } from "@/lib/queries/lists";

const COLOR_BG: Record<string, string> = {
  "#2563EB": "bg-blue-600",
  "#7c3aed": "bg-violet-600",
  "#db2777": "bg-pink-600",
  "#dc2626": "bg-red-600",
  "#ea580c": "bg-orange-600",
  "#ca8a04": "bg-yellow-600",
  "#16a34a": "bg-green-600",
  "#0891b2": "bg-cyan-600",
};

type ListState = ListWithCount & { inList: boolean; sublists?: ListState[] };

function addInListFlag(l: ListWithCount, memberSet: Set<string>): ListState {
  return {
    ...l,
    inList: memberSet.has(l.id),
    sublists: l.sublists?.map((s) => addInListFlag(s as ListWithCount, memberSet)),
  };
}

function updateListById(lists: ListState[], id: string, inList: boolean): ListState[] {
  return lists.map((l) => {
    if (l.id === id) return { ...l, inList };
    if (l.sublists) return { ...l, sublists: updateListById(l.sublists, id, inList) };
    return l;
  });
}

type Props = {
  mediaId: string;
  onClose: () => void;
};

export function ListPickerModal({ mediaId, onClose }: Props) {
  const router = useRouter();
  const [lists, setLists] = useState<ListState[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [listsData, membershipData] = await Promise.all([
          fetch("/api/lists").then((r) => r.json()),
          fetch(`/api/lists/membership?mediaId=${mediaId}`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        const memberSet = new Set<string>(
          (membershipData as Array<{ list_id: string }>).map((m) => m.list_id)
        );
        setLists((listsData as ListWithCount[]).map((l) => addInListFlag(l, memberSet)));
      } catch {
        if (!cancelled) toast.error("Failed to load lists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [mediaId]);

  async function handleToggle(list: ListState) {
    setToggling(list.id);
    try {
      if (list.inList) {
        const res = await fetch(`/api/lists/${list.id}/items`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        });
        if (!res.ok) throw new Error();
        setLists((prev) => updateListById(prev, list.id, false));
        toast.success(`Removed from ${list.name}`);
        router.refresh();
      } else {
        const res = await fetch(`/api/lists/${list.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        });
        if (res.status === 409) {
          setLists((prev) => updateListById(prev, list.id, true));
          return;
        }
        if (!res.ok) throw new Error();
        setLists((prev) => updateListById(prev, list.id, true));
        toast.success(`Added to ${list.name}`);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setToggling(null);
    }
  }

  function renderRow(list: ListState, indented = false) {
    const colorCls = COLOR_BG[list.color] ?? "bg-blue-600";
    return (
      <button
        key={list.id}
        type="button"
        disabled={toggling === list.id}
        onClick={() => void handleToggle(list)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-50",
          indented ? "pl-5 pr-2" : "px-2"
        )}
      >
        <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", colorCls)} />
        <span className="flex-1 truncate text-left text-foreground">{list.name}</span>
        {list.inList && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
      </button>
    );
  }

  function renderList(list: ListState) {
    if (list.sublists && list.sublists.length > 0) {
      return (
        <div key={list.id}>
          <p className="px-2 pb-0.5 pt-2 text-xs font-medium text-muted-foreground">
            {list.name}
          </p>
          {(list.sublists as ListState[]).map((sub) => renderRow(sub, true))}
        </div>
      );
    }
    return renderRow(list);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-t-xl border border-border bg-card p-4 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Add to list</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-8 animate-pulse rounded-md bg-secondary" />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No lists yet.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {lists.map((list) => renderList(list))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          Done
        </button>
      </div>
    </div>
  );
}
