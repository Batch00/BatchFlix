"use client";

import { useState, useEffect } from "react";
import { ListPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type Props = {
  mediaId: string;
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

export function AddToListButton({ mediaId }: Props) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListState[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
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
    load();
    return () => {
      cancelled = true;
    };
  }, [open, mediaId]);

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
        onClick={() => handleToggle(list)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors hover:bg-secondary disabled:opacity-50",
          indented ? "pl-5 pr-2" : "px-2"
        )}
      >
        <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", colorCls)} />
        <span className="flex-1 truncate text-left text-foreground">
          {list.name}
        </span>
        {list.inList && (
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        )}
      </button>
    );
  }

  function renderList(list: ListState) {
    const hasSublists = list.sublists && list.sublists.length > 0;
    if (hasSublists) {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ListPlus className="h-4 w-4" />
          Add to List
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-h-80 overflow-y-auto">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          My Lists
        </p>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-8 animate-pulse rounded-md bg-secondary"
              />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lists yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {lists.map((list) => renderList(list))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
