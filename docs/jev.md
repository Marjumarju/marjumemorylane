# Jev (TypeSafe System One) — usage spec for Memory Lane

Jev is TypeSafe's classification model. You give it **state** (the text to judge) and
**named questions**, and it returns **typed answers** — a probability, a chosen label, or a
score — instead of prose you have to parse. In this app it is meant for classifying what
family members say: transcripts from `/record` and written notes.

This document is the contract we hold ourselves to when calling it, including the privacy
rules, which matter more here than in a typical integration: the text we classify is family
memories, spoken by named people including children.

- Official docs: <https://docs.typesafe.ai/>
- Console: <https://console.typesafe.ai>
- JS SDK: `@typesafe-ai/sdk` (verified against 0.6.0), repo
  <https://github.com/typesafe-ai/typesafe-sdk-js>

---

## 1. Getting an API key

1. Sign up / sign in at <https://console.typesafe.ai>.
2. Open <https://console.typesafe.ai/keys> and create a key. Format: `sk-...`.
3. Put it in `.env` at the repo root, next to the Supabase values:

   ```
   TYPESAFE_API_KEY=sk-...
   ```

   `.env` is already gitignored. Do **not** prefix it with `VITE_` — `VITE_*` variables are
   inlined into the client bundle and would ship the key to every visitor.
4. For the deployed app, add the same variable to the host's environment:
   - Railway: service → Variables.
   - Lovable: the published build runs on Cloudflare; set it in the Lovable project's
     secrets, not in the repo.
5. Never commit the key, never paste it into a chat, never log it. To rotate: create a new
   key in the console, deploy it, then delete the old one.

The SDK reads `TYPESAFE_API_KEY` from the environment on its own — `new TypeSafeClient()`
with no arguments is the normal usage. Other recognised variables: `TYPESAFE_BASE_URL`,
`TYPESAFE_DEFAULT_MODEL`, `TYPESAFE_LOG_LEVEL`.

## 2. Model, limits, cost

| | |
|---|---|
| Current model | `jev-1.13.0`; aliases `jev-latest` (SDK default) and `jev-preview` |
| Endpoint | `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer $TYPESAFE_API_KEY` |
| Input | **Text only.** String, JSON object, or array of text. No audio, no images |
| Context | 64k tokens total; 32k for state + the longest question |
| Rate limits | 250,000 tokens/second, 1,200 requests/minute (TypeSafe notes these move without notice) |
| Price | $0.042 per million input tokens; output tokens free |
| Node | SDK requires Node ≥ 20 |

Cost in practice: a three-minute story transcript is a few hundred tokens, so a classification
pass is a rounding error. Many questions in **one** request cost one state pass — batch them.

Pin `jev-1.13.0` rather than `jev-latest` if you need answers to stay stable across a
demo or a dataset; use `jev-latest` when you want improvements for free.

## 3. Request shape

```ts
import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
const { answers, model, usage } = await client.systemOne({
  state: { question: "...", story: "..." },   // string | JSON object | array | null
  questions: { /* name -> question */ },       // must be non-empty
  model: "jev-latest",                         // optional; inherits defaultModel
});
```

`state` shaping, per the docs: a plain string suits a single message or passage; a JSON
object is preferred for most requests because each part gets a descriptive name and the
relationships stay clear; an array suits a sequence of messages. Put the content and
supporting facts in `state`; put the judgments in `questions`.

Per-call options (second argument): `timeout`, `retry`, `headers`, `signal`.

## 4. The three question types

### `noul(instructions, criteria?)` — yes/no probability

```ts
noul("The story actually answers the question asked")
noul("Does the message contain personal data?", {
  true: "Health, money, addresses, phone numbers, full names of minors",
  false: "An ordinary family memory",
})
```

Answer: `{ type: "noul", noul: number }` — probability of *yes*, 0 to 1. A statement works as
well as a question; phrase it so that **higher means yes**, never invert it. Near 0.5 means
the model finds yes and no similarly probable. There is no separate confidence field: with
only two outcomes, the single value describes the whole distribution.

Threshold depends on the cost of being wrong. 0.5 when yes and no are equally cheap to act
on; raise it when acting on a false yes is expensive; lower it when missing a true yes is
expensive. For our privacy gate (section 6) a false yes only costs an extra confirmation
click, so the threshold is deliberately low.

### `choice(instructions, criteria)` — pick one label

```ts
choice("The overall feeling of this memory", {
  warm: "Affection, pride, belonging",
  funny: "Told as a joke or a happy absurdity",
  hard: "Loss, fear, hardship",
  matter_of_fact: null,          // null = undescribed label
})
```

Answer: `{ type: "choice", choice, confidence, probabilities }`. `choice` is typed as a key
of the criteria object, so a typo in a downstream comparison fails at compile time — this is
the reason to use the SDK helpers rather than hand-written JSON.

### `score(instructions, criteria)` — rate against a rubric

```ts
score("How much detail does this story carry?", [
  "A few words, no story at all",
  "One thin fact",
  "A real memory with some detail",
  "A vivid story with names, places and feeling",
])
```

Criteria is an ordered array indexed from 0, **at least two entries** (the SDK throws
otherwise). Answer: `{ type: "score", score, confidence, legend, probabilities }`. `score` is
an expected value, so it may land between rubric levels — `2.4` is legitimate; don't assume
integers.

### Confidence

`confidence` (choice and score only) is derived from the *shape* of the probability
distribution: concentrated probabilities mean high confidence, spread-out probabilities mean
low. TypeSafe's guidance:

- `> 0.9` — act automatically.
- `0.5 – 0.9` — proceed carefully: confirm with the user, flag for review.
- `< 0.5` — do not act: fall back, ask, or route to a human.

Scale thresholds with consequences. In this app nothing Jev decides is destructive, so the
practical rule is: low confidence means *show it to the person and let them edit*, which is
what the transcript textarea already does.

## 5. Errors and retries

The SDK retries on its own: 2 retries by default, 500ms initial backoff doubling to 5s, 25%
jitter, on 408, 429 and 5xx, honouring `Retry-After`. Don't add a second retry loop.

Error classes to catch: `BadRequestError` (400), `AuthenticationError` (401, bad or missing
key), `PermissionDeniedError` (403), `UnprocessableEntityError` (422), `RateLimitError` (429,
carries `retryAfterMs`), `InternalServerError` (5xx), `APIConnectionError` /
`APITimeoutError`, `APIUserAbortError`. All extend `TypeSafeError`.

Classification must never block saving a story. If Jev fails, log it, leave the label columns
null, and save. Follow the shape already used by `transcribeAudio`: catch, map to a sentence a
family member can understand, and carry on.

`x-typesafe-request-id` is exposed as `requestId` (via `.withResponse()`, or on `APIError`).
Log that, not the text — see below.

## 6. Privacy rules

These are binding for this repo, not suggestions.

**Understand the trade-off honestly.** Every `systemOne` call sends the story text to
`api.typesafe.ai`, a third party, over the network. The transcript *is* the personal data:
it contains names, places, family relationships, health and money details, and things said by
and about children. There is no local or on-device Jev, and no amount of field-renaming
changes the fact that the memory itself leaves the machine. So the question is never "how do
we scrub it" — it is "is this call worth making at all, and does the family know".

**What TypeSafe states.** Jev is not trained on customer requests or responses, per their
Privacy Policy. Zero data retention (ZDR) is available **only** for enterprise customers via
`sales@typesafe.ai`. Their legal documents live at <https://docs.typesafe.ai/legal> (Data
Processing Agreement, Master Customer Agreement, Privacy Policy).

> Unverified at the time of writing: the actual default retention period, the subprocessor
> list, and the DPA terms. Read those three documents before this app handles anyone's
> memories for real, and record the retention number here.

**Rules:**

1. **Server only.** Call Jev from a TanStack Start server function (`createServerFn`), never
   from a component. Never set `dangerouslyAllowBrowser: true` — the SDK's own comment for
   that flag is that it exposes the API key to page users.
2. **Never `logLevel: "debug"` outside local development.** The SDK's documented behaviour:
   known credential headers are redacted, **bodies are not**. Debug logging writes family
   transcripts into the host's log stream, where they will outlive the request and sit in a
   log vendor. Production stays at the default `warn`.
3. **Minimise the state.** Send the question text and the story text. Do **not** add
   `storyteller_id`, `about_person_id`, Supabase row ids, `audio_path`, birth years, or
   anything from `family.json`. Those turn an anonymous paragraph into a linkable profile and
   buy no accuracy.
4. **Never send audio.** Jev is text-only anyway; recordings stay in the Supabase
   `recordings` bucket and never leave it for classification.
5. **Store labels, not echoes.** Persist only the derived values (a number, a label). Never
   store a model-generated paraphrase or summary of the text in a new column; that quietly
   creates a second copy of the memory with different access rules.
6. **Log request ids, not content.** On failure, log `requestId`, status, and question names.
   Never log `state`, never log the transcript, never put either in an error message shown by
   `toast`.
7. **Classify once, at save time.** Don't re-classify on every render or page view. One call
   per story, on the way into the database. Fewer copies in flight, lower cost, no surprise
   traffic from a list page.
8. **The `sensitive` gate is the point, not a bonus.** Run the personal-data noul *before*
   the row is written and before anything is shown on a shared page, so the family gets a
   "this mentions health details — still save it?" prompt while they can still act. A privacy
   check that runs after publication is decoration.
9. **Children.** `family.json` contains minors (`generation` 3, `tells_stories:
   "with_help"`). Stories told by or about them get the same treatment as everything else —
   and if the family wants classification off for a child, that is a legitimate setting to
   add, not an edge case to argue with.
10. **Consent is a UI obligation.** If this ships, the record screen says plainly that the
    written-down version of the story is sent to a classification service, and offers a way
    to save without it. Silence here is the actual privacy failure; the code rules above are
    just hygiene.

## 7. Where it plugs into this app

| Concern | File |
|---|---|
| Existing precedent for a server-side AI call | [`src/lib/transcribe.functions.ts`](../src/lib/transcribe.functions.ts) |
| New server function for classification | `src/lib/classify.functions.ts` (to add) |
| Transcript arrives here | [`src/routes/record.tsx:65`](../src/routes/record.tsx) (the `blob` effect) |
| Row is written here — the gate belongs before this `insert` | [`src/routes/record.tsx:145`](../src/routes/record.tsx) (`save()`) |
| Label columns | `drizzle/migrations/0003_story_labels.sql` (to add) |
| Reading labels back | [`src/lib/stories.ts`](../src/lib/stories.ts), [`src/routes/stories.tsx`](../src/routes/stories.tsx) |
| Taxonomy to classify against | [`src/lib/family.ts`](../src/lib/family.ts) (`categories`, `topicsFor`, `followUps`) |

Note that written notes (`note`) reach the database without passing through transcription, so
a hook placed only in the transcription effect misses them. `save()` covers both paths.

## 8. Reference implementation

`src/lib/classify.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";
import { z } from "zod";

/** Questions we ask about every story. One request, four answers, one state pass. */
const questions = {
  on_topic: noul("The story actually answers the question that was asked"),
  richness: score("How much detail does this story carry?", [
    "A few words, no story at all",
    "One thin fact",
    "A real memory with some detail",
    "A vivid story with names, places and feeling",
  ]),
  mood: choice("The overall feeling of this memory", {
    warm: "Affection, pride, belonging",
    funny: "Told as a joke or a happy absurdity",
    hard: "Loss, fear, hardship",
    matter_of_fact: null,
  }),
  sensitive: noul("Contains personal details the family may not want on a shared page", {
    true: "Health, money, addresses, phone numbers, conflict between relatives",
    false: "An ordinary family memory",
  }),
} as const;

export const classifyStory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ text: z.string().min(1).max(50_000), question: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!process.env["TYPESAFE_API_KEY"]) return null; // classification is optional
    const client = new TypeSafeClient(); // logLevel stays at the default `warn`
    try {
      // Only the question and the story. No ids, no names from family.json.
      const { answers } = await client.systemOne({
        state: { question: data.question, story: data.text },
        questions,
      });
      return {
        on_topic: answers.on_topic.noul,
        richness: answers.richness.score,
        mood: answers.mood.choice,
        sensitive: answers.sensitive.noul,
      };
    } catch (e) {
      // requestId and status only — never the state.
      console.error("Classification failed", e instanceof Error ? e.message : e);
      return null;
    }
  });
```

`drizzle/migrations/0003_story_labels.sql`:

```sql
alter table public.stories
  add column on_topic real,
  add column richness real,
  add column mood text,
  add column sensitive real;
```

No new grants or policies: the existing `stories` policies from `0001` and `0002` are
table-wide and cover added columns.

Call site in `save()`, before the insert:

```ts
const labels = await classifyFn({ data: { text: transcript.trim() || note.trim(), question } });
if (labels && labels.sensitive > 0.6 && !confirmedSensitive) {
  setSensitiveWarning(true); // ask the family first; do not write the row yet
  setSaving(false);
  return;
}
```

A low `on_topic` is a good moment to offer a `followUps` prompt instead of a silent save, and
`richness` gives [`stories.tsx`](../src/routes/stories.tsx) something to sort by.

## 9. Checklist before merging an integration

- [ ] `TYPESAFE_API_KEY` set locally and on the host; not `VITE_`-prefixed; not committed.
- [ ] Every Jev call lives in a `createServerFn` handler.
- [ ] `dangerouslyAllowBrowser` appears nowhere in the repo.
- [ ] `logLevel` is not `debug` in anything that runs on a server.
- [ ] The state sent contains no person ids, names from `family.json`, row ids, or audio paths.
- [ ] A Jev outage or a missing key still lets a story save.
- [ ] No transcript text in logs or in user-facing error messages.
- [ ] The sensitive check runs before `insert`, not after.
- [ ] The record screen tells the family that the text is sent for classification.
- [ ] TypeSafe's DPA and Privacy Policy read, retention period written into section 6.

## 10. Sources

- TypeSafe docs: <https://docs.typesafe.ai/> — quickstart, primitives, confidence, state,
  models, legal.
- `@typesafe-ai/sdk` 0.6.0 TypeScript declarations (the authority for the shapes above).
- Third-party setup guide <https://lmspedia.org/how-to-install-jev-setup-guide/> — where this
  integration started; every claim in this document was re-checked against the official docs
  and the published SDK, not that page.
