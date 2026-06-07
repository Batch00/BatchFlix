"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/library");
  }

  async function handleDemo() {
    setDemoError("");
    setDemoLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@batchflix.com",
      password: "BatchFlixDemo2026!",
    });
    if (error) {
      setDemoError("Demo unavailable. Try again.");
      setDemoLoading(false);
      return;
    }
    router.push("/library");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] rounded-xl border border-border bg-card p-8">
        <div className="mb-4 flex justify-center">
          <Clapperboard className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-center text-2xl font-semibold">
          <span className="text-foreground">Batch</span>
          <span className="text-primary">Flix</span>
        </h1>

        <p className="mt-1 text-center text-sm text-muted-foreground">
          Track everything you watch
        </p>

        <form onSubmit={handleSignIn} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </form>

        <div className="relative my-5 flex items-center">
          <div className="flex-grow border-t border-border" />
          <span className="mx-3 text-xs text-muted-foreground">or</span>
          <div className="flex-grow border-t border-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={demoLoading}
          onClick={() => void handleDemo()}
        >
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Try a demo"
          )}
        </Button>
        {demoError && (
          <p className="text-center text-sm text-destructive">{demoError}</p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        BatchFlix is invite-only. Request access at{" "}
        <a
          href="https://www.batch-apps.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          batch-apps.com
        </a>
      </p>
    </div>
  );
}
