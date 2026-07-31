import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SearchProvider } from "@/components/search/SearchProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  // Matches the next/font default, stated explicitly so it survives edits.
  // No weight list: this loads the variable font, so there are no unused
  // static weights to trim.
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BatchFlix",
    template: "%s | BatchFlix",
  },
  description: "Your personal movie and TV tracker.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "BatchFlix",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ServiceWorkerRegistration />
        <Providers>
          <SearchProvider>
            {children}
          </SearchProvider>
        </Providers>
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
