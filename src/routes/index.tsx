import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ageOf, childrenOf, generation, partnerOf, people, type Person } from "@/lib/family";
import { storiesQuery } from "@/lib/stories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our family tree · Memory Lane" },
      { name: "description", content: "Three generations of the family, and the stories each of them has told." },
      { property: "og:title", content: "Our family tree · Memory Lane" },
      { property: "og:description", content: "Three generations of the family, and the stories each of them has told." },
    ],
  }),
  component: Home,
});

function PersonChip({ p }: { p: Person }) {
  return (
    <Link to="/people/$id" params={{ id: p.id }} className="group block rounded-lg border border-border bg-card px-4 py-3 text-center transition hover:border-primary">
      <div className="font-display text-lg group-hover:text-primary">{p.name}</div>
      <div className="text-xs text-muted-foreground">{generation(p) === 3 ? `${ageOf(p)} years` : `b. ${p.birth_year}`}</div>
    </Link>
  );
}

function Home() {
  const g1 = people.filter((p) => generation(p) === 1);
  const g2 = people.filter((p) => generation(p) === 2 && p.parents.length > 0);

  return (
    <div>
      <h1 className="font-display text-5xl">Our family</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Everyone's stories, from the past and from life today. Tap a person to hear what they've told, or tell a story of your own.</p>

      <section className="mt-12">
        <h2 className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Grandparents</h2>
        <div className="grid max-w-md grid-cols-2 gap-3">{g1.map((p) => <PersonChip key={p.id} p={p} count={count(p.id)} />)}</div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Their children, partners and grandchildren</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {g2.map((p) => {
            const partner = partnerOf(p.id);
            const kids = childrenOf(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-dashed border-border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <PersonChip p={p} count={count(p.id)} />
                  {partner && <PersonChip p={partner} count={count(partner.id)} />}
                </div>
                {kids.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
                    {kids.map((k) => <PersonChip key={k.id} p={k} count={count(k.id)} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
