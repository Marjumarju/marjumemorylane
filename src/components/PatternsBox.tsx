import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Network, RefreshCw } from "lucide-react";
import { personById } from "@/lib/family";
import { storiesQuery } from "@/lib/stories";
import { detailsQuery } from "@/lib/details";
import { getPatterns } from "@/lib/patterns.functions";

export function usePatterns() {
  const { data: stories = [] } = useQuery(storiesQuery);
  const { data: details = [] } = useQuery(detailsQuery);
  const fetchPatterns = useServerFn(getPatterns);
  const v = `${stories.length}-${stories[0]?.id ?? ""}-${details.map((d) => d.updated_at).sort().at(-1) ?? ""}`;
  const key = ["patterns", v];
  const q = useQuery({ queryKey: key, queryFn: () => fetchPatterns({ data: { v } }), staleTime: Infinity, retry: false });
  return { ...q, key };
}

const Name = ({ id }: { id: string }) => (
  <Link to="/people/$id" params={{ id }} className="font-medium text-primary hover:underline">{personById(id)?.name ?? id}</Link>
);

export function PatternsBox() {
  const q = usePatterns();
  const qc = useQueryClient();
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><Network className="h-4 w-4 text-primary" /> Patterns across the family</div>
        {q.data?.enough && (
          <button type="button" onClick={() => qc.invalidateQueries({ queryKey: q.key })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        )}
      </div>
      {q.isPending ? (
        <p className="mt-2 text-sm text-muted-foreground">Looking for threads between everyone's stories…</p>
      ) : q.isError ? (
        <p className="mt-2 text-sm text-muted-foreground">{q.error.message}</p>
      ) : !q.data.enough ? (
        <p className="mt-2 text-sm text-muted-foreground">Patterns will appear once more of the family has recorded a story.</p>
      ) : (
        <div className="mt-3 space-y-5">
          {q.data.threads.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Common threads</h3>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {q.data.threads.map((t, i) => (
                  <li key={i} className="rounded-lg border border-border bg-background p-3">
                    <div className="font-display text-lg leading-tight">{t.title}</div>
                    <p className="mt-1 text-sm">{t.summary}</p>
                    {t.people.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">{t.people.map((id, j) => <span key={id}>{j > 0 && ", "}<Name id={id} /></span>)}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.data.connections.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Connections</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {q.data.connections.map((c, i) => (
                  <li key={i}><Name id={c.a} /> &amp; <Name id={c.b} /> — {c.why}</li>
                ))}
              </ul>
            </div>
          )}
          {q.data.generations && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Across generations</h3>
              <p className="mt-2 text-sm">{q.data.generations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConnectedLine({ id }: { id: string }) {
  const q = usePatterns();
  const others = new Set<string>();
  q.data?.connections.forEach((c) => { if (c.a === id) others.add(c.b); if (c.b === id) others.add(c.a); });
  if (!others.size) return null;
  return (
    <p className="mt-3 text-sm text-muted-foreground">
      Connected stories: {[...others].map((o, j) => <span key={o}>{j > 0 && ", "}<Name id={o} /></span>)}
    </p>
  );
}
