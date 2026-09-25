import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Mic, Users } from "lucide-react";
import { categories, people, personById } from "@/lib/family";
import { storiesQuery } from "@/lib/stories";
import { StoryCard } from "@/components/StoryCard";
import { PatternsBox } from "@/components/PatternsBox";

type Search = { person?: string | undefined; category?: string | undefined };

export const Route = createFileRoute("/stories")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    person: typeof s["person"] === "string" ? s["person"] : undefined,
    category: typeof s["category"] === "string" ? s["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All stories · Memory Lane" },
      { name: "description", content: "Browse every story the family has recorded, by person or by topic." },
      { property: "og:title", content: "All stories · Memory Lane" },
      { property: "og:description", content: "Browse every story the family has recorded, by person or by topic." },
    ],
  }),
  component: Browse,
});

const sel = "rounded-md border border-input bg-card px-3 py-2 text-sm";

function Browse() {
  const { person, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/stories" });
  const { data: stories = [], isLoading } = useQuery(storiesQuery);
  const list = stories.filter(
    (s) => (!person || s.storyteller_id === person || s.about_person_id === person) && (!category || s.category_id === category),
  );
  const set = (k: keyof Search, v: string) => navigate({ search: (prev) => ({ ...prev, [k]: v || undefined }) });

  const filtered = !!(person || category);
  const tellerCount = new Set(stories.map((s) => s.storyteller_id)).size;
  const latest = stories[0];

  return (
    <div>
      <h1 className="font-display text-5xl">Stories</h1>

      {/* Snapshot */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <BookOpen className="mx-auto mb-1 h-5 w-5 text-primary" />
          <div className="font-display text-2xl">{stories.length}</div>
          <div className="text-xs text-muted-foreground">{stories.length === 1 ? "story" : "stories"} told</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Mic className="mx-auto mb-1 h-5 w-5 text-primary" />
          <div className="font-display text-2xl">{tellerCount}</div>
          <div className="text-xs text-muted-foreground">{tellerCount === 1 ? "voice" : "voices"} recorded</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
          <div className="font-display text-2xl">{people.length}</div>
          <div className="text-xs text-muted-foreground">in the family</div>
        </div>
      </div>

      {latest && !filtered && (
        <p className="mt-4 text-sm text-muted-foreground">
          Latest: <span className="font-medium text-foreground">{personById(latest.storyteller_id)?.name}</span> told a story
          {latest.title ? <> — “{latest.title}”</> : null}.
        </p>
      )}

      {!filtered && <PatternsBox />}

      {/* Category grid */}
      <h2 className="mt-10 mb-4 text-xs uppercase tracking-widest text-muted-foreground">Pick a topic</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => {
          const count = stories.filter((s) => s.category_id === c.id).length;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => set("category", active ? "" : c.id)}
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary"
              }`}
            >
              <div className="font-display text-lg leading-tight">{c.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {count > 0 ? `${count} ${count === 1 ? "story" : "stories"}` : "No stories yet"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Person filter + results */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {filtered ? "Matching stories" : "All stories"}
        </h2>
        <select className={sel} value={person ?? ""} onChange={(e) => set("person", e.target.value)}>
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {filtered && (
          <Link to="/stories" search={{}} className="text-sm text-primary underline underline-offset-2">
            Clear filters
          </Link>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : list.length ? (
          list.map((s) => <StoryCard key={s.id} story={s} />)
        ) : (
          <p className="text-muted-foreground">No stories here yet — be the first to tell one.</p>
        )}
      </div>
    </div>
  );
}
