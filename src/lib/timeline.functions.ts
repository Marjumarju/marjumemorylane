import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askAi } from "@/lib/about.functions";
import { personById } from "@/lib/family";

/** Reads a person's stories + details and adds new timeline events (never touches manual ones). */
export const extractTimeline = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ personId: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const p = personById(data.personId);
    if (!p) throw new Error("Unknown person");
    const { publicClient } = await import("@/lib/family-context.server");
    const sb = publicClient();
    const [{ data: stories }, { data: det }, { data: existing }] = await Promise.all([
      sb.from("stories").select("id, question, transcript, note, title").or(`storyteller_id.eq.${p.id},about_person_id.eq.${p.id}`).limit(40),
      sb.from("person_details").select("city, studies").eq("person_id", p.id).maybeSingle(),
      sb.from("person_timeline").select("year, label").eq("person_id", p.id),
    ]);
    const studies = ((det?.studies as { what?: string; where?: string; from_year?: number | null; to_year?: number | null }[] | null) ?? []).map((s) => {
      const base = [s.what, s.where].filter(Boolean).join(" at ");
      const years = s.from_year && s.to_year ? ` (${s.from_year}–${s.to_year})` : s.from_year ? ` (from ${s.from_year})` : s.to_year ? ` (until ${s.to_year})` : "";
      return base + years;
    });
    const prompt = [
      `Build life timeline events for ${p.name}, born ${p.birth_year}.`,
      `Return ONLY a JSON array like [{"year": 1993, "end_year": 1996, "label": "Studied logistics at Taltech", "place": "Tallinn", "story_id": null}]. year is when it started and may be null if unknown; end_year is when it ended for things that lasted (studies, living in a place, a job) and must be null for one-off events; place may be null; story_id is the id of the story the event came from, or null.`,
      `ONLY major life milestones: birth, moving to a new city or country, starting or finishing studies, starting a significant job or career change, marriage, birth of a child, a life-changing event. At most 6 events in total.`,
      `Do NOT include holidays, trips, hobbies, everyday anecdotes, feelings, or small moments from stories. If a story holds no milestone, return nothing for it. Short labels. Never invent facts or years; estimate only when clearly implied.`,
      `Always include "Born" with year ${p.birth_year}.`,
      det?.city ? `Lives now in ${det.city}.` : "",
      studies.length ? `Studies: ${studies.join("; ")}` : "",
      `Already on the timeline (do NOT repeat): ${(existing ?? []).map((e) => `${e.year ?? "?"} ${e.label}`).join("; ") || "nothing"}`,
      `Stories:\n${(stories ?? []).map((s) => `[${s.id}] ${s.question} — ${s.transcript || s.note || s.title || ""}`).join("\n") || "none"}`,
    ].filter(Boolean).join("\n\n");

    const raw = await askAi(prompt);
    let events: { year: number | null; end_year: number | null; label: string; place: string | null; story_id: string | null }[] = [];
    try {
      const s = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const ids = new Set((stories ?? []).map((x) => x.id));
      events = (JSON.parse(s) as { year?: unknown; end_year?: unknown; label?: unknown; place?: unknown; story_id?: unknown }[])
        .map((e) => ({
          year: Number.isInteger(e.year) ? (e.year as number) : null,
          end_year: Number.isInteger(e.end_year) ? (e.end_year as number) : null,
          label: String(e.label ?? "").trim().slice(0, 200),
          place: e.place ? String(e.place).slice(0, 100) : null,
          story_id: typeof e.story_id === "string" && ids.has(e.story_id) ? e.story_id : null,
        }))
        .filter((e) => e.label);
    } catch {
      throw new Error("Couldn't read the timeline — try again.");
    }
    const seen = new Set((existing ?? []).map((e) => `${e.year}|${e.label.toLowerCase()}`));
    const fresh = events.filter((e) => !seen.has(`${e.year}|${e.label.toLowerCase()}`)).slice(0, 6);
    if (fresh.length) {
      const { error } = await sb.from("person_timeline").insert(fresh.map((e) => ({ ...e, person_id: p.id, source: "story" })));
      if (error) throw new Error(error.message);
    }
    return { added: fresh.length };
  });
