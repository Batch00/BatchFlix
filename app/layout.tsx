import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SearchProvider } from "@/components/search/SearchProvider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BatchFlix",
  description: "Your personal movie and TV tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
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
