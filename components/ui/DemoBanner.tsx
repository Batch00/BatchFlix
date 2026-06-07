export function DemoBanner() {
  return (
    <div className="w-full border-b border-[#f59e0b]/20 bg-[#1c1407] px-4 py-2 text-center text-sm text-[#f59e0b]">
      You are viewing a demo account.{" "}
      <a
        href="https://www.batch-apps.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#fbbf24] underline"
      >
        Sign up at batch-apps.com
      </a>{" "}
      to track your own watchlist.
    </div>
  );
}
