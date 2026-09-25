import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ audio: z.string().min(1).max(40_000_000), mime: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Transcription isn't set up yet.");
    const mime = data.mime.split(";")[0] || "audio/webm";
    const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
    const bytes = Buffer.from(data.audio, "base64");
    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("file", new File([bytes], `story.${ext}`, { type: mime }));
    form.append("response_format", "json");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Transcription failed [${res.status}]: ${body}`);
      if (res.status === 402) throw new Error("Out of AI credits — transcripts are paused for now.");
      if (res.status === 429) throw new Error("Too many requests — please try again in a minute.");
      throw new Error(`Transcription failed (${res.status}).`);
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
