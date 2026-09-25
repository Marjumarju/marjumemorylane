import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { app, ageOf, generation, personById } from "@/lib/family";
import type { Database } from "@/integrations/supabase/types";

/** Streams a Responses call and returns the final text. */
export async function askAi(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI isn't set up yet.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: prompt,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`About generation failed [${res.status}]: ${body}`);
    if (res.status === 402) throw new Error("Out of AI credits — About text is paused for now.");
    if (res.status === 429) throw new Error("Too many requests — please try again in a minute.");
    throw new Error(`About generation failed (${res.status}).`);
  }
  // Consume the SSE stream and collect the answer text.
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        else if (ev.type === "response.completed" && ev.response?.output_text) text = ev.response.output_text;
      } catch {
        // ignore keep-alives / partial JSON
      }
    }
  }
  return text.trim();
}

export const getPersonAbout = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ personId: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const p = personById(data.personId);
    if (!p) throw new Error("Unknown person");
    const gen = generation(p);
    const era = app.generation_context[String(gen)] ?? "";

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
    const { data: rows } = await supabase
      .from("stories")
      .select("question, transcript, note")
      .or(`storyteller_id.eq.${p.id},about_person_id.eq.${p.id}`)
      .order("created_at", { ascending: false })
      .limit(12);

    const { data: det } = await supabase.from("person_details").select("city, studies").eq("person_id", p.id).maybeSingle();
    const studies = ((det?.studies as { what?: string; where?: string }[] | null) ?? []).map((x) => [x.what, x.where].filter(Boolean).join(" at ")).filter(Boolean);
    const facts = [det?.city ? `Lives in ${det.city}.` : "", studies.length ? `Studied: ${studies.join("; ")}.` : ""].filter(Boolean).join(" ");

    const snippets = (rows ?? [])
      .map((r) => [r.question, r.transcript || r.note].filter(Boolean).join(" — "))
      .filter(Boolean)
      .slice(0, 12);

    const prompt = [
      `Write a short, warm "About" paragraph (2-4 sentences, plain text, no headings) about ${p.name}, ${ageOf(p)} years old, for a private family storybank.`,
      `Era context: ${era}`,
      facts ? `Facts: ${facts}` : "",
      snippets.length
        ? `They have told these stories (question — what they said):\n${snippets.join("\n")}\nWeave in what their stories reveal about them, without listing them.`
        : `They have not recorded any stories yet; describe their era and gently invite the first story.`,
      `Write in English, third person, affectionate but not gushing.`,
    ].filter(Boolean).join("\n\n");

    const about = await askAi(prompt);
    return { about, storyCount: rows?.length ?? 0 };
  });
