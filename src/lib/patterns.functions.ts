import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { categories, generation, people, personById } from "@/lib/family";
import type { Database } from "@/integrations/supabase/types";
import { askAi } from "@/lib/about.functions";

export type Patterns = {
  threads: { title: string; summary: string; people: string[] }[];
  connections: { a: string; b: string; why: string }[];
  generations: string;
  enough: boolean;
};

export const getPatterns = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ v: z.string().max(200) }).parse(d))
  .handler(async (): Promise<Patterns> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const [{ data: rows }, { data: dets }] = await Promise.all([
      supabase.from("stories").select("storyteller_id, about_person_id, category_id, question, transcript, note").order("created_at", { ascending: false }).limit(80),
      supabase.from("person_details").select("person_id, city, studies"),
    ]);
    const stories = rows ?? [];
    if (stories.length < 2) return { threads: [], connections: [], generations: "", enough: false };

    const peopleLines = people.map((p) => {
      const d = dets?.find((x) => x.person_id === p.id);
      const st = ((d?.studies as { what?: string; where?: string }[] | null) ?? []).map((s) => [s.what, s.where].filter(Boolean).join(" at ")).join("; ");
      return `${p.id}: ${p.name}, born ${p.birth_year}, generation ${generation(p)}${d?.city ? `, lives in ${d.city}` : ""}${st ? `, studied ${st}` : ""}`;
    });
    const storyLines = stories.map((s) => {
      const cat = categories.find((c) => c.id === s.category_id)?.title ?? s.category_id;
      const body = (s.transcript || s.note || "").slice(0, 600);
      return `[teller ${s.storyteller_id}${s.about_person_id && s.about_person_id !== s.storyteller_id ? `, about ${s.about_person_id}` : ""}] (${cat}) Q: ${s.question}${body ? ` A: ${body}` : ""}`;
    });

    const prompt = `You analyse a private family storybank and find patterns across people's stories.
People (id: details):
${peopleLines.join("\n")}

Stories:
${storyLines.join("\n")}

Return ONLY JSON, no markdown:
{"threads":[{"title":"short theme","summary":"one sentence","people":["id",...]}],"connections":[{"a":"id","b":"id","why":"one sentence on how their stories link"}],"generations":"1-2 sentences on how generations echo or differ"}
Rules: 2-5 threads, up to 6 connections, only use ids from the list, only claim what the stories or details support. Warm, concrete English.`;

    const raw = await askAi(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    let parsed: Partial<Patterns> = {};
    try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }
    const ok = (id: unknown): id is string => typeof id === "string" && !!personById(id);
    return {
      enough: true,
      threads: (parsed.threads ?? []).filter((t) => t && t.title).map((t) => ({ title: String(t.title), summary: String(t.summary ?? ""), people: (t.people ?? []).filter(ok) })),
      connections: (parsed.connections ?? []).filter((c) => c && ok(c.a) && ok(c.b) && c.a !== c.b).map((c) => ({ a: c.a, b: c.b, why: String(c.why ?? "") })),
      generations: typeof parsed.generations === "string" ? parsed.generations : "",
    };
  });
