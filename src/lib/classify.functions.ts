import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askAi } from "@/lib/about.functions";

/**
 * Story labels, classified once on the way into the database.
 *
 * Two providers answer the same four questions. Jev (TypeSafe) is the real one; the Lovable
 * gateway stands in until a Jev key exists. See docs/jev.md — especially the privacy rules:
 * only the question and the story text ever leave this function.
 */
export type StoryLabels = {
  /** Probability the story answers the question that was asked, 0 to 1. */
  on_topic: number;
  /** Detail carried by the story, 0 (nothing) to 3 (vivid), may fall between levels. */
  richness: number;
  mood: Mood;
  /** Probability the story holds personal details the family may not want shared, 0 to 1. */
  sensitive: number;
  provider: "jev" | "lovable";
  /**
   * Whether the numbers come from a model trained to report calibrated probabilities.
   * False for the gateway fallback: its numbers order stories sensibly but must not be
   * compared against the thresholds in TypeSafe's docs.
   */
  calibrated: boolean;
};

const MOODS = ["warm", "funny", "hard", "matter_of_fact"] as const;
type Mood = (typeof MOODS)[number];

/** One wording of each question, shared by both providers so their answers stay comparable. */
const ASK = {
  on_topic: "The story actually answers the question that was asked",
  richness: [
    "A few words, no story at all",
    "One thin fact",
    "A real memory with some detail",
    "A vivid story with names, places and feeling",
  ],
  mood: {
    warm: "Affection, pride, belonging",
    funny: "Told as a joke or a happy absurdity",
    hard: "Loss, fear, hardship",
    matter_of_fact: "Plainly told, no strong feeling either way",
  },
  sensitive: {
    question: "Contains personal details the family may not want on a shared page",
    true: "Health, money, addresses, phone numbers, conflict between relatives",
    false: "An ordinary family memory",
  },
} as const;

const clamp = (n: unknown, max: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
const asMood = (v: unknown): Mood => (MOODS as readonly string[]).includes(String(v)) ? (v as Mood) : "matter_of_fact";

/** The state both providers see: the question asked and what was said. Nothing else. */
type State = { question: string; story: string };

/**
 * TypeSafe's Jev, over plain fetch rather than @typesafe-ai/sdk — the repo installs with bun
 * and the SDK buys us retries and typed helpers we can live without. Request shape:
 * POST /v1/systemone with `state`, `model` and named `questions`. See docs/jev.md section 3.
 */
async function classifyWithJev(key: string, state: State): Promise<StoryLabels> {
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      model: process.env["TYPESAFE_DEFAULT_MODEL"] ?? "jev-latest",
      questions: {
        on_topic: { type: "noul", instructions: ASK.on_topic },
        richness: { type: "score", instructions: "How much detail does this story carry?", criteria: ASK.richness },
        mood: { type: "choice", instructions: "The overall feeling of this memory", criteria: ASK.mood },
        sensitive: {
          type: "noul",
          instructions: ASK.sensitive.question,
          criteria: { true: ASK.sensitive.true, false: ASK.sensitive.false },
        },
      },
    }),
  });
  if (!res.ok) {
    // Request id and status only — never the state. docs/jev.md rule 6.
    const id = res.headers.get("x-typesafe-request-id") ?? "none";
    throw new Error(`Jev classification failed (${res.status}, request ${id})`);
  }
  const json = (await res.json()) as {
    answers?: {
      on_topic?: { noul?: number };
      richness?: { score?: number };
      mood?: { choice?: string };
      sensitive?: { noul?: number };
    };
  };
  const a = json.answers ?? {};
  return {
    on_topic: clamp(a.on_topic?.noul, 1),
    richness: clamp(a.richness?.score, 3),
    mood: asMood(a.mood?.choice),
    sensitive: clamp(a.sensitive?.noul, 1),
    provider: "jev",
    calibrated: true,
  };
}

/**
 * Stand-in while Jev signups are paused: the Lovable gateway already used for transcripts and
 * the family chat, asked for the same four answers as strict JSON.
 */
async function classifyWithGateway(state: State): Promise<StoryLabels> {
  const prompt = [
    `Judge one story from a private family storybank. Return ONLY JSON, no markdown fences, no commentary.`,
    `Shape: {"on_topic": number 0-1, "richness": number 0-3, "mood": one of ${MOODS.join(" | ")}, "sensitive": number 0-1}`,
    `on_topic — probability that the story answers the question asked. 1 means it answers it squarely.`,
    `richness — how much detail the story carries. ${ASK.richness.map((r, i) => `${i} = ${r}`).join("; ")}.`,
    `mood — the overall feeling. ${Object.entries(ASK.mood).map(([k, v]) => `${k} = ${v}`).join("; ")}.`,
    `sensitive — probability the story holds details the family may not want on a shared page. Yes covers: ${ASK.sensitive.true}. No covers: ${ASK.sensitive.false}.`,
    `QUESTION ASKED: ${state.question}`,
    `WHAT THEY SAID: ${state.story}`,
  ].join("\n\n");

  const raw = await askAi(prompt);
  const cleaned = raw.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("Gateway classification returned no JSON");
  const parsed = JSON.parse(cleaned.slice(start, cleaned.lastIndexOf("}") + 1)) as Record<string, unknown>;
  return {
    on_topic: clamp(parsed["on_topic"], 1),
    richness: clamp(parsed["richness"], 3),
    mood: asMood(parsed["mood"]),
    sensitive: clamp(parsed["sensitive"], 1),
    provider: "lovable",
    calibrated: false,
  };
}

/**
 * Classify one story. Returns null when no provider is configured or the call fails —
 * classification is a nicety, saving a memory is not, so the caller always proceeds.
 */
export const classifyStory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ text: z.string().min(1).max(50_000), question: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data }): Promise<StoryLabels | null> => {
    const state: State = { question: data.question, story: data.text };
    const jevKey = process.env["TYPESAFE_API_KEY"];
    try {
      return jevKey ? await classifyWithJev(jevKey, state) : await classifyWithGateway(state);
    } catch (e) {
      // Message only. The story text never reaches the logs.
      console.error("Classification failed:", e instanceof Error ? e.message : String(e));
      return null;
    }
  });
