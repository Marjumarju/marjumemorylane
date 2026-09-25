# Ask the family: a question box on the Stories page

## What you'll get
- A new "Ask about the family" box on the Stories page, above the patterns.
- Type a question such as "Who grew up in the countryside?", "What did Ene say about school?" or "Which stories mention Tõrva?" and get an answer based on the recorded stories, their written transcripts, the family tree (names, ages, who is related to whom) and each person's details (where they live, what they studied).
- It's a back-and-forth chat, so you can ask follow-ups ("And what about Kalmer?"). It clears when you leave the page. Nothing is saved.
- Answers name the people and topics they come from. If the stories don't cover the question, it says so and suggests who could be asked to record that story, instead of making things up.
- A few example questions to tap when the box is empty, and a "New conversation" button to start over.

## Technical details
- New server route `src/routes/api/chat.ts` (POST): builds a system prompt from family.json (people, relations, generation_context), all stories (teller, about, category/subtopic, question, title, note, transcript) and person_details. Streams with AI SDK `streamText` using `@ai-sdk/openai` `.responses("openai/gpt-6-astra")` through the Lovable AI Gateway, with the full Responses options block (forceReasoning, effort low, summary auto, store false, encrypted reasoning), run-ID fetch wrapper, and `toUIMessageStreamResponse`. 402/429 return friendly messages shown in the chat.
- New `src/components/FamilyChat.tsx` using `useChat` + `DefaultChatTransport` and AI Elements (Conversation, Message, MessageResponse, PromptInput, PromptInputSubmit, Suggestion). Messages render from `message.parts`; typing indicator while submitted; textarea stays focused. Uses a family-themed avatar, not a generic sparkle icon.
- Install `ai`, `@ai-sdk/react`, `@ai-sdk/openai` and the needed AI Elements.
- Render `FamilyChat` in `src/routes/stories.tsx` when no filters are active.
- Test: ask a real question and a follow-up, and check both answers come back.
