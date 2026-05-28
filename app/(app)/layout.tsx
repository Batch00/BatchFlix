import { TopNav } from "@/components/nav/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
    </>
  );
}
