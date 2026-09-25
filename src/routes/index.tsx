import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ageOf, childrenOf, generation, partnerOf, people, photos, type Person } from "@/lib/family";

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
    <Link
      to="/people/$id"
      params={{ id: p.id }}
      className="group block w-24 shrink-0 rounded-xl border border-border bg-card px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      {photos[p.id] ? (
        <img src={photos[p.id]} alt={p.name} className="mx-auto mb-2 h-14 w-14 rounded-full object-cover ring-2 ring-background" />
      ) : (
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted font-display text-lg text-muted-foreground ring-2 ring-background">
          {p.name.charAt(0)}
        </div>
      )}
      <div className="font-display text-base leading-tight group-hover:text-primary">{p.name}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{ageOf(p)} years old</div>
    </Link>
  );
}

/** Two partners side by side, joined by a small heart on a line. */
function Couple({ a, b }: { a: Person; b?: Person | undefined }) {
  return (
    <div className="flex items-center justify-center">
      <PersonChip p={a} />
      {b && (
        <>
          <div className="relative mx-1 flex h-px w-6 items-center justify-center bg-border">
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
          </div>
          <PersonChip p={b} />
        </>
      )}
    </div>
  );
}

/** One family branch: a couple, with a line down to their children. */
function FamilyBranch({ p }: { p: Person }) {
  const partner = partnerOf(p.id);
  const kids = childrenOf(p.id);
  return (
    <div className="flex flex-col items-center">
      {/* stub up to the grandparents' line */}
      <div className="h-8 w-px bg-border" />
      <Couple a={p} b={partner} />
      {kids.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="relative flex items-start justify-center gap-3">
            {kids.length > 1 && (
              <div className="absolute top-0 right-[12%] left-[12%] h-px bg-border" />
            )}
            {kids.map((k) => (
              <div key={k.id} className="flex flex-col items-center">
                <div className="h-4 w-px bg-border" />
                <PersonChip p={k} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Home() {
  const g1 = people.filter((p) => generation(p) === 1);
  const g2 = people.filter((p) => generation(p) === 2 && p.parents.length > 0);

  return (
    <div>
      <h1 className="font-display text-5xl">Our family</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Everyone's stories, from the past and from life today. Tap a person to hear what they've told, or tell a story of your own.
      </p>

      <div className="mt-10 overflow-x-auto pb-6">
        <div className="mx-auto flex min-w-max flex-col items-center px-4">
          {/* Grandparents at the root */}
          {g1[0] && <Couple a={g1[0]} b={g1[1]} />}

          {/* Trunk down to the horizontal line that branches to each child */}
          <div className="h-8 w-px bg-border" />
          <div className="relative w-full">
            <div className="absolute top-0 right-[12.5%] left-[12.5%] h-px bg-border" />
            <div className="flex items-start justify-center gap-6 sm:gap-10">
              {g2.map((p) => (
                <FamilyBranch key={p.id} p={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
