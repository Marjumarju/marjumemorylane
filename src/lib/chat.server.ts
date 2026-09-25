import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildFamilyContext } from "@/lib/family-context.server";

const RUN = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN)) headers.set(RUN, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN)?.trim() || undefined;
      return res;
    },
  };
}

export async function handleChat(request: Request) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return new Response("AI isn't set up yet.", { status: 500 });
  let messages: UIMessage[];
  try {
    ({ messages } = (await request.json()) as { messages: UIMessage[] });
    if (!Array.isArray(messages) || messages.length > 60) throw new Error();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const ctx = await buildFamilyContext();
  const system = [
    `You answer questions about one family, using only the family storybank below. Answer in English, warmly and concisely (a few sentences or a short list).`,
    `Name the people and topics your answer comes from. If the stories don't cover it, say so honestly and suggest who in the family could record that story. Never invent facts.`,
    `ERAS:\n${ctx.eras}`,
    `FAMILY:\n${ctx.tree}`,
    `STORIES:\n${ctx.storyLines}`,
  ].join("\n\n");

  const rf = runIdFetch();
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: rf.fetch,
  });

  const result = streamText({
    model: openai.responses("openai/gpt-6-astra"),
    system,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: (err) => {
      const msg = String((err as { message?: string })?.message ?? err);
      console.error("chat error", msg);
      if (msg.includes("402")) return "Out of AI credits — questions are paused for now.";
      if (msg.includes("429")) return "Too many questions at once — please try again in a minute.";
      return "Sorry, I couldn't answer that just now.";
    },
  });
}
