import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { askAi } from "@/lib/about.functions";
import { categories, people, personById } from "@/lib/family";
import type { Database } from "@/integrations/supabase/types";

export const generateFamilyHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({}).passthrough().parse(d))
  .handler(async (): Promise<{ story: string }> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${process.env["SUPABASE_ANON_KEY"] ?? ""}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const [{ data: storyRows }, { data: detailsRows }] = await Promise.all([
      supabase
        .from("stories")
        .select("storyteller_id, about_person_id, category_id, question, title, note, transcript, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("person_details").select("person_id, city, studies"),
    ]);

    const detailMap = new Map((detailsRows ?? []).map((d) => [d.person_id, d]));
    const peopleLines = people.map((person) => {
      const detail = detailMap.get(person.id);
      const studies = ((detail?.studies as { what?: string; where?: string }[] | null) ?? [])
        .map((study) => [study.what, study.where].filter(Boolean).join(" at "))
        .filter(Boolean)
        .join("; ");
      const facts = [detail?.city ? `lives in ${detail.city}` : "", studies ? `studied ${studies}` : ""].filter(Boolean);
      return `${person.name} (${person.id}) — born ${person.birth_year}${person.role ? `, ${person.role}` : ""}${facts.length ? `; ${facts.join("; ")}` : ""}`;
    });

    const storyLines = (storyRows ?? []).map((story) => {
      const teller = personById(story.storyteller_id)?.name ?? "Unknown storyteller";
      const about = personById(story.about_person_id ?? story.storyteller_id)?.name ?? "the family";
      const category = categories.find((c) => c.id === story.category_id)?.title ?? null;
      const body = (story.transcript || story.note || "").replace(/\s+/g, " ").trim();
      const trimmed = body.length > 800 ? `${body.slice(0, 800)}…` : body;
      return `- ${teller} told a story about ${about}${category ? ` in the ${category} topic` : ""}${story.question ? `, prompted by: “${story.question}”` : ""}${trimmed ? `: ${trimmed}` : ""}`;
    });

    const prompt = [
      "Write a warm, readable family-history story in English for a private family archive.",
      "Use only the information in the family tree and stories below. Do not invent facts or dates that are not supported by the source material.",
      "Turn the recorded stories into a coherent narrative of the family's history, written like a story rather than a list or summary.",
      "Aim for 500-900 words, in plain prose with 3-6 paragraphs, and close with a note of affection for the family and its story-telling tradition.",
      "People and life details:",
      peopleLines.join("\n"),
      "Stories:",
      storyLines.length ? storyLines.join("\n") : "There are no recorded family stories yet.",
    ].join("\n\n");

    const raw = await askAi(prompt);
    const story = raw.replace(/^```(?:markdown|md|json)?/i, "").replace(/```$/m, "").trim();
    return { story: story || "We couldn't build a family history from the stories yet." };
  });
