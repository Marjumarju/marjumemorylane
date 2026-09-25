import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ageOf, app, categories, childrenOf, generation, partnerOf, people, personById } from "@/lib/family";

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const catTitle = (c: string | null, s: string | null) => {
  if (!c) return "";
  const cat = categories.find((x) => x.id === c);
  const sub = cat?.subtopics.find((x) => x.id === s);
  return [cat?.title, sub?.title].filter(Boolean).join(" / ");
};

/** Plain-text snapshot of the whole family: tree, details, timelines and stories. */
export async function buildFamilyContext() {
  const sb = publicClient();
  const [{ data: stories }, { data: details }, { data: timeline }] = await Promise.all([
    sb.from("stories").select("*").order("created_at", { ascending: true }).limit(300),
    sb.from("person_details").select("*"),
    sb.from("person_timeline").select("*").order("year", { ascending: true }),
  ]);

  const tree = people
    .map((p) => {
      const partner = partnerOf(p.id);
      const kids = childrenOf(p.id).map((k) => k.name);
      const parents = p.parents.map((id) => personById(id)?.name).filter(Boolean);
      const d = details?.find((x) => x.person_id === p.id);
      const studies = ((d?.studies as { what?: string; where?: string }[] | null) ?? [])
        .map((s) => [s.what, s.where].filter(Boolean).join(" at "))
        .filter(Boolean);
      const tl = (timeline ?? []).filter((t) => t.person_id === p.id).map((t) => `${t.year ?? "?"}: ${t.label}${t.place ? ` (${t.place})` : ""}`);
      return [
        `- ${p.name} (id ${p.id}), born ${p.birth_year}, age ${ageOf(p)}, generation ${generation(p)}`,
        parents.length ? `parents: ${parents.join(", ")}` : "",
        partner ? `partner: ${partner.name}` : "",
        kids.length ? `children: ${kids.join(", ")}` : "",
        d?.birth_place ? `born in ${d.birth_place}` : "",
        d?.city ? `lives in ${d.city}` : "",
        studies.length ? `studied: ${studies.join("; ")}` : "",
        tl.length ? `timeline: ${tl.join("; ")}` : "",
      ].filter(Boolean).join("; ");
    })
    .join("\n");

  const storyLines = (stories ?? [])
    .map((s) => {
      const teller = personById(s.storyteller_id)?.name ?? s.storyteller_id;
      const about = s.about_person_id ? personById(s.about_person_id)?.name : null;
      return `[story ${s.id}] ${s.created_at.slice(0, 10)} told by ${teller}${about ? ` about ${about}` : ""} — topic ${catTitle(s.category_id, s.subtopic_id) || "none (freely told)"}${s.question ? ` — question: "${s.question}"` : ""}${s.title ? ` — title: ${s.title}` : ""}${s.transcript ? ` — said: ${s.transcript}` : ""}${s.note ? ` — note: ${s.note}` : ""}`;
    })
    .join("\n");

  const eras = Object.entries(app.generation_context).map(([g, t]) => `Generation ${g}: ${t}`).join("\n");
  return { tree, storyLines: storyLines || "(no stories recorded yet)", eras, stories: stories ?? [], details: details ?? [], timeline: timeline ?? [] };
}
