import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic, RefreshCw, Sparkles } from "lucide-react";
import { ageOf, categories, generation, personById, photos } from "@/lib/family";
import { storiesQuery } from "@/lib/stories";
import { getPersonAbout } from "@/lib/about.functions";
import { StoryCard } from "@/components/StoryCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/people/$id")({
  loader: ({ params }) => {
    const p = personById(params.id);
    if (!p) throw notFound();
    return { name: p.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Family member"} · Memory Lane` },
      { name: "description", content: `Stories told by and about ${loaderData?.name ?? "this family member"}.` },
      { property: "og:title", content: `${loaderData?.name ?? "Family member"} · Memory Lane` },
      { property: "og:description", content: `Stories told by and about ${loaderData?.name ?? "this family member"}.` },
    ],
  }),
  component: Profile,
  notFoundComponent: () => <p>We couldn't find that person in the family tree.</p>,
  errorComponent: ({ error }) => <p role="alert">{error.message}</p>,
});

function Profile() {
  const { id } = Route.useParams();
  const p = personById(id)!;
  const { data: stories = [] } = useQuery(storiesQuery);
  const told = stories.filter((s) => s.storyteller_id === id && (!s.about_person_id || s.about_person_id === id));
  const about = stories.filter((s) => s.about_person_id === id && s.storyteller_id !== id);
  const gen = generation(p);
  const canTell = p.tells_stories !== "told_by_family";

  const mine = stories.filter((s) => s.storyteller_id === id || s.about_person_id === id);
  const topicsCovered = categories.filter((c) => mine.some((s) => s.category_id === c.id));
  const photo = photos[id];

  return (
    <div>
      <div className="flex items-center gap-5">
        {photo ? (
          <img src={photo} alt={p.name} className="h-24 w-24 rounded-full border-2 border-border object-cover shadow-md" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted font-display text-3xl shadow-md">{p.name[0]}</div>
        )}
        <div>
          <h1 className="font-display text-5xl">{p.name}</h1>
          <p className="mt-1 text-muted-foreground">{ageOf(p)} years old</p>
        </div>
      </div>

      {/* Story snapshot — grows as stories are told */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Mic className="h-4 w-4 text-primary" />
          {mine.length === 0
            ? `No stories about ${p.name} yet`
            : `${mine.length} ${mine.length === 1 ? "story" : "stories"} ${told.length > 0 ? `· ${told.length} in ${p.name}'s own voice` : `about ${p.name}`}`}
        </div>
        {topicsCovered.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {topicsCovered.map((c) => (
              <Link key={c.id} to="/stories" search={{ person: id, category: c.id }} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary">
                {c.title}
              </Link>
            ))}
          </div>
        )}
        {mine.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Record the first one and this page will start filling in.</p>
        )}
      </div>


      <div className="mt-6 flex flex-wrap gap-3">
        {canTell && <Link to="/record" search={{ teller: id }}><Button>{p.tells_stories === "with_help" ? `Help ${p.name} tell a story` : `Record as ${p.name}`}</Button></Link>}
        {gen === 3 && <Link to="/record" search={{ about: id }}><Button variant="outline">Tell a story about {p.name}</Button></Link>}
      </div>

      {canTell && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">In {p.name}'s own words</h2>
          <div className="mt-4 space-y-4">
            {told.length ? told.map((s) => <StoryCard key={s.id} story={s} />) : <p className="text-muted-foreground">No stories yet.</p>}
          </div>
        </section>
      )}
      {(gen === 3 || about.length > 0) && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Stories about {p.name}</h2>
          <div className="mt-4 space-y-4">
            {about.length ? about.map((s) => <StoryCard key={s.id} story={s} />) : <p className="text-muted-foreground">Nobody has told one yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
