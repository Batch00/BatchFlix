import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export function KPICard({ label, value, icon: Icon }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111] p-5">
      <Icon className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/40" />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}
