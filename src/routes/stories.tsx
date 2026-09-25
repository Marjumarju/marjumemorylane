import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categories, people } from "@/lib/family";
import { storiesQuery } from "@/lib/stories";
import { StoryCard } from "@/components/StoryCard";

type Search = { person?: string; category?: string };

export const Route = createFileRoute("/stories")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    person: typeof s.person === "string" ? s.person : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
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

  return (
    <div>
      <h1 className="font-display text-5xl">Stories</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <select className={sel} value={person ?? ""} onChange={(e) => set("person", e.target.value)}>
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={sel} value={category ?? ""} onChange={(e) => set("category", e.target.value)}>
          <option value="">All topics</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="mt-8 space-y-4">
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : list.length ? list.map((s) => <StoryCard key={s.id} story={s} />) : <p className="text-muted-foreground">No stories here yet.</p>}
      </div>
    </div>
  );
}
