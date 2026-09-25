import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { TreeDeciduous } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const EXAMPLES = ["Who has told the most stories?", "What do the grandparents remember about school?", "Which places come up across the stories?"];

export function FamilyChat() {
  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const ask = (text: string) => text.trim() && sendMessage({ text: text.trim() });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <TreeDeciduous className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl">Ask about the family</h2>
            <p className="text-sm text-muted-foreground">Answers come from the stories you've recorded.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => { stop(); setMessages([]); }}>
            New conversation
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <Conversation className="max-h-[420px]">
          <ConversationContent>
            {messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                  {m.parts.map((p, i) => (p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null))}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <p className="text-sm italic text-muted-foreground">Looking through the stories…</p>}
            {error && <p className="text-sm text-destructive">{error.message || "Something went wrong."}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {messages.length === 0 && (
        <Suggestions className="mb-3">
          {EXAMPLES.map((q) => <Suggestion key={q} suggestion={q} onClick={ask} />)}
        </Suggestions>
      )}

      <PromptInput onSubmit={(msg) => ask(msg.text ?? "")} className="mt-3">
        <PromptInputTextarea autoFocus placeholder="Ask anything about your family…" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </section>
  );
}
