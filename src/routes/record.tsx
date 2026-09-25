import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ageOf, followUps, generation, people, personById, tellers, topicsFor, type Category, type Subtopic } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tellerId, setTellerId] = useState(search.teller ?? "");
  const [aboutId, setAboutId] = useState(search.about ?? search.teller ?? "");
  const [pick, setPick] = useState<{ c: Category; s: Subtopic } | null>(null);
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const teller = personById(tellerId);
  const about = personById(aboutId) ?? teller;
  const adult = teller && ageOf(teller) >= 18;
  const littleOnes = people.filter((p) => generation(p) === 3);
  const topics = teller && about ? topicsFor(teller, about) : [];
  const tellerChoices = search.about ? tellers.filter((p) => ageOf(p) >= 18) : tellers;

  useEffect(() => () => window.clearInterval(timer.current), []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        setBlob(new Blob(chunks, { type: mr.mimeType }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
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

  async function save() {
    if (!teller || !pick || !session) return;
    setSaving(true);
    let audio_path: string | null = null;
    if (blob) {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      audio_path = `${teller.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("recordings").upload(audio_path, blob, { contentType: blob.type });
      if (up.error) { setSaving(false); toast.error(up.error.message); return; }
    }
    const { error } = await supabase.from("stories").insert({
      storyteller_id: teller.id,
      about_person_id: about?.id ?? teller.id,
      category_id: pick.c.id,
      subtopic_id: pick.s.id,
      question,
      note: note.trim() || null,
      audio_path,
      duration_seconds: blob ? secs : null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
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

      {teller && adult && (
        <Step n={2} title="Whose story is it?">
          <div className="flex flex-wrap gap-2">
            <button className={pill(aboutId === teller.id)} onClick={() => { setAboutId(teller.id); setPick(null); }}>My own</button>
            {littleOnes.map((k) => (
              <button key={k.id} className={pill(aboutId === k.id)} onClick={() => { setAboutId(k.id); setPick(null); }}>About {k.name}</button>
            ))}
          </div>
        </Step>
      )}

      {teller && (
        <Step n={adult ? 3 : 2} title="Pick a topic">
          <div className="space-y-5">
            {topics.map((c) => (
              <div key={c.id}>
                <div className="font-display text-lg">{c.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.subtopics.map((s) => (
                    <button key={s.id} className={pill(pick?.s.id === s.id)} onClick={() => { setPick({ c, s }); setQuestion(s.example_question); }}>{s.title}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>
      )}

      {pick && (
        <Step n={adult ? 4 : 3} title="Your question">
          <div className="rounded-xl bg-secondary p-6">
            <p className="font-display text-2xl leading-snug">{question}</p>
            {pick.s.shared && (
              <p className="mt-3 text-sm text-muted-foreground">This is a shared memory. Tell your own version, the way you remember it. Try not to listen to anyone else's first.</p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            {!recording ? (
              <Button size="lg" onClick={start}>{blob ? "Record again" : "● Start recording"}</Button>
            ) : (
              <Button size="lg" variant="destructive" onClick={stop}>■ Stop · {mmss}</Button>
            )}
            {blob && !recording && <audio controls src={URL.createObjectURL(blob)} />}
          </div>
          {recording && (
            <div className="mt-4 text-sm text-muted-foreground">
              Stuck? Try: {followUps.map((f) => <span key={f} className="mr-3 italic">{f}</span>)}
            </div>
          )}

          <Textarea className="mt-6" rows={4} placeholder="Add a written note, names, or type the story if you'd rather not record (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="mt-4" size="lg" disabled={saving || recording || (!blob && !note.trim())} onClick={save}>
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
