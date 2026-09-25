import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ageOf, followUps, generation, people, personById, tellers, topicsFor, type Category, type Subtopic } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { classifyStory, type StoryLabels } from "@/lib/classify.functions";
import { blobToBase64, pickMime } from "@/lib/audio";
import { STORY_MEDIA_ACCEPT, uploadStoryMedia, validateStoryMedia } from "@/lib/story-media";

type Search = { teller?: string | undefined; about?: string | undefined };

export const Route = createFileRoute("/record")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    teller: typeof s["teller"] === "string" ? s["teller"] : undefined,
    about: typeof s["about"] === "string" ? s["about"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tell a story · Memory Lane" },
      { name: "description", content: "Pick a question and record a family story in your own voice." },
      { property: "og:title", content: "Tell a story · Memory Lane" },
      { property: "og:description", content: "Pick a question and record a family story in your own voice." },
    ],
  }),
  component: Record,
});

const pill = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`;

function Record() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tellerId, setTellerId] = useState(search.teller ?? "");
  const [aboutId, setAboutId] = useState(search.about ?? search.teller ?? "");
  const [pick, setPick] = useState<{ c: Category; s: Subtopic } | null>(null);
  const [free, setFree] = useState(false);
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const transcribeFn = useServerFn(transcribeAudio);
  const classifyFn = useServerFn(classifyStory);
  const [labels, setLabels] = useState<StoryLabels | null>(null);
  const [askSensitive, setAskSensitive] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [level, setLevel] = useState(0);
  const heard = useRef(0);
  const meter = useRef<{ ctx: AudioContext; raf: number } | null>(null);

  const teller = personById(tellerId);
  const about = personById(aboutId) ?? teller;
  const adult = teller && ageOf(teller) >= 18;
  const littleOnes = people.filter((p) => generation(p) === 3);
  const topics = teller && about ? topicsFor(teller, about) : [];
  const tellerChoices = search.about ? tellers.filter((p) => ageOf(p) >= 18) : tellers;

  useEffect(() => () => window.clearInterval(timer.current), []);
  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);
  useEffect(() => {
    if (!blob) { setPreviewUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setPreviewUrl(u);
    let cancelled = false;
    setTranscribing(true);
    setTranscript("");
    setLabels(null);
    setAskSensitive(false);
    blobToBase64(blob)
      .then((audio) => transcribeFn({ data: { audio, mime: blob.type } }))
      .then((r) => { if (!cancelled) setTranscript(r.text); })
      .catch((e) => { if (!cancelled) toast.error(e instanceof Error ? e.message : "Couldn't transcribe"); })
      .finally(() => { if (!cancelled) setTranscribing(false); });
    return () => { cancelled = true; URL.revokeObjectURL(u); };
  }, [blob]);

  function ask(c: Category) {
    const subs = c.subtopics.length > 1 && pick ? c.subtopics.filter((s) => s.id !== pick.s.id) : c.subtopics;
    const s = subs[Math.floor(Math.random() * subs.length)];
    if (!s) return;
    setFree(false);
    setPick({ c, s });
    setQuestion(s.example_question);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      heard.current = 0;
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        const l = Math.min(1, peak / 64);
        if (l > 0.05) heard.current++;
        setLevel(l);
        meter.current!.raf = requestAnimationFrame(tick);
      };
      meter.current = { ctx, raf: requestAnimationFrame(tick) };
      mr.onstop = () => {
        if (meter.current) { cancelAnimationFrame(meter.current.raf); meter.current.ctx.close(); meter.current = null; }
        setLevel(0);
        if (heard.current < 5) {
          toast.error("We couldn't hear anything — your microphone sent silence. Check it isn't muted, or open the app in its own browser tab and allow the microphone.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setBlob(new Blob(chunks, { type: (mr.mimeType || mime || "audio/webm").split(";")[0] ?? "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(1000);
      rec.current = mr;
      setBlob(null);
      setSecs(0);
      setRecording(true);
      timer.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      toast.error("We couldn't reach your microphone. Check your browser's permission.");
    }
  }
  function stop() {
    rec.current?.stop();
    window.clearInterval(timer.current);
    setRecording(false);
  }

  async function save(confirmedSensitive = false) {
    if (!teller || (!pick && !free)) return;
    setSaving(true);

    // Classify before anything is written, so a story the family may not want shared can
    // still be stopped while they can act on it. See docs/jev.md.
    const text = transcript.trim() || note.trim();
    let marks = labels;
    if (text && !marks) {
      marks = await classifyFn({ data: { text, question: free ? question.trim() : question } });
      setLabels(marks);
    }
    if (marks && marks.sensitive > 0.6 && !confirmedSensitive) {
      setAskSensitive(true);
      setSaving(false);
      return;
    }

    let audio_path: string | null = null;
    if (blob) {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      audio_path = `${teller.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("recordings").upload(audio_path, blob, { contentType: blob.type });
      if (up.error) { setSaving(false); toast.error(up.error.message); return; }
    }
    const { data: savedStory, error } = await supabase.from("stories").insert({
      storyteller_id: teller.id,
      about_person_id: about?.id ?? teller.id,
      category_id: free ? null : pick.c.id,
      subtopic_id: free ? null : pick.s.id,
      question: free ? (question.trim() || null) : question,
      note: note.trim() || null,
      audio_path,
      duration_seconds: blob ? secs : null,
      transcript: transcript.trim() || null,
      on_topic: marks?.on_topic ?? null,
      richness: marks?.richness ?? null,
      mood: marks?.mood ?? null,
      sensitive: marks?.sensitive ?? null,
      labels_provider: marks?.provider ?? null,
    } as never).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (mediaFile && savedStory) {
      try {
        await uploadStoryMedia(savedStory.id, mediaFile);
      } catch (mediaError) {
        toast.error(mediaError instanceof Error ? `Story saved, but the media wasn't added: ${mediaError.message}` : "Story saved, but the media wasn't added");
      }
    }
    await qc.invalidateQueries({ queryKey: ["stories"] });
    toast.success("Story saved. Thank you!");
    nav({ to: "/people/$id", params: { id: about?.id ?? teller.id } });
  }

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-5xl">Tell a story</h1>

      <Step n={1} title="Who's telling?">
        <div className="flex flex-wrap gap-2">
          {tellerChoices.map((p) => (
            <button key={p.id} className={pill(p.id === tellerId)} onClick={() => { setTellerId(p.id); if (!search.about) setAboutId(p.id); setPick(null); }}>{p.name}</button>
          ))}
        </div>
        {teller?.tells_stories === "with_help" && <p className="mt-3 text-sm text-muted-foreground">Sit with {teller.name} and read the question out loud together.</p>}
      </Step>

      {teller && (
        <Step n={2} title="Pick an area">
          <div className="flex flex-wrap gap-2">
            {topics.map((c) => (
              <button key={c.id} className={pill(pick?.c.id === c.id)} onClick={() => ask(c)}>{c.title}</button>
            ))}
            <button className={pill(false)} onClick={() => topics.length && ask(topics[Math.floor(Math.random() * topics.length)]!)}>Surprise me</button>
            <button className={pill(free)} onClick={() => { setFree(true); setPick(null); }}>No topic — just tell it</button>
          </div>
        </Step>
      )}

      {(pick || free) && (
        <Step n={3} title={free ? "Your story" : "Your question"}>
          {free ? (
            <input
              className="w-full rounded-xl border border-border bg-card px-4 py-3 font-display text-xl"
              placeholder="What's it about? (optional)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          ) : (
          <div className="rounded-xl bg-secondary p-6">
            <p className="font-display text-2xl leading-snug">{question}</p>
            {pick.s.shared && (
              <p className="mt-3 text-sm text-muted-foreground">This is a shared memory. Tell your own version, the way you remember it. Try not to listen to anyone else's first.</p>
            )}
            {!recording && !blob && (
              <button className="mt-4 text-sm text-primary underline underline-offset-4" onClick={() => ask(pick.c)}>Give me another question</button>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            {!recording ? (
              <Button size="lg" onClick={start}>{blob ? "Record again" : "● Start recording"}</Button>
            ) : (
              <Button size="lg" variant="destructive" onClick={stop}>■ Stop · {mmss}</Button>
            )}
          </div>
          {previewUrl && !recording && (
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Listen back</p>
              <audio controls src={previewUrl} className="w-full" />
              <p className="mt-4 mb-1 text-xs uppercase tracking-widest text-muted-foreground">What you said</p>
              {transcribing ? (
                <p className="text-sm italic text-muted-foreground">Writing it down…</p>
              ) : (
                <>
                  <Textarea rows={5} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="The transcript will appear here" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your recording is written down by a speech service, and the written words are sent to a
                    classification service that sorts the story by topic and feeling. Edit the text above before
                    saving if there is something you would rather not send.
                  </p>
                </>
              )}
            </div>
          )}
          {recording && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary" aria-label="Microphone level">
              <div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          )}
          {recording && level < 0.02 && secs >= 3 && (
            <p className="mt-2 text-sm text-destructive">No sound is reaching the app yet — is your microphone muted?</p>
          )}
          {recording && (
            <div className="mt-4 text-sm text-muted-foreground">
              Stuck? Try: {followUps.map((f) => <span key={f} className="mr-3 italic">{f}</span>)}
            </div>
          )}

          <Textarea className="mt-6" rows={4} placeholder="Add a written note, names, or type the story if you'd rather not record (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Photo or video <span className="normal-case tracking-normal">(optional)</span></p>
            <input
              ref={mediaInput}
              type="file"
              accept={STORY_MEDIA_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try { validateStoryMedia(file); setMediaFile(file); }
                catch (error) { toast.error(error instanceof Error ? error.message : "Choose another file"); }
                event.target.value = "";
              }}
            />
            {mediaPreview ? (
              <div className="mt-3 max-w-md">
                {mediaFile?.type.startsWith("image/") ? (
                  <img src={mediaPreview} alt="Story attachment preview" className="max-h-72 w-full rounded-md object-cover" />
                ) : (
                  <video src={mediaPreview} controls className="max-h-72 w-full rounded-md bg-foreground" />
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{mediaFile?.name}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMediaFile(null)}><X className="h-4 w-4" /> Remove</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" className="mt-3" onClick={() => mediaInput.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Add a photo or short video
              </Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">One photo or video clip, up to 25 MB. You can change it later.</p>
          </div>
          {askSensitive && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm">
                This one sounds personal — it may mention health, money, addresses or a family falling-out.
                Everyone in the family can read what you save here.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setAskSensitive(false); void save(true); }}>Save it anyway</Button>
                <Button size="sm" variant="outline" onClick={() => setAskSensitive(false)}>Let me edit it first</Button>
              </div>
            </div>
          )}
          <Button className="mt-4" size="lg" disabled={saving || recording || transcribing || (!blob && !note.trim())} onClick={() => void save()}>
            {saving ? "Saving…" : "Save story"}
          </Button>
        </Step>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{n}. {title}</h2>
      {children}
    </section>
  );
}
