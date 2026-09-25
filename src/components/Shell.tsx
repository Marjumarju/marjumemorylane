import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Shell({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="font-display text-2xl italic text-foreground">Memory Lane</Link>
          {session && (
            <nav className="flex items-center gap-5 text-sm">
              <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-primary font-semibold" }}>Family</Link>
              <Link to="/stories" activeProps={{ className: "text-primary font-semibold" }}>Stories</Link>
              <Link to="/record"><Button size="sm">Tell a story</Button></Link>
              <button className="text-muted-foreground" onClick={() => supabase.auth.signOut()}>Sign out</button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        {!ready ? null : session ? children : <SignIn />}
      </main>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    if (mode === "up" && !res.data.session) toast.success("Check your email to confirm your account.");
  }
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-4xl">The family storybank</h1>
      <p className="mt-3 text-muted-foreground">Stories from the past and from life today, told in our own voices. Sign in to listen and add yours.</p>
      <Button variant="outline" className="mt-8 w-full" onClick={google}>Continue with Google</Button>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <Button className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
      </form>
      <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
