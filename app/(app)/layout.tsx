import { TopNav } from "@/components/nav/TopNav";
// TODO: import { DemoBanner } from "@/components/ui/DemoBanner";
// Render <DemoBanner /> between <TopNav /> and <main> once demo auth is wired up

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {/* TODO: <DemoBanner /> -- add here once demo mode auth is implemented */}
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
    </>
  );
}
