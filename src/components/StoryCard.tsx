import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { categoryById, personById, subtopicById } from "@/lib/family";
import { audioUrl, type Story } from "@/lib/stories";

export function StoryCard({ story }: { story: Story }) {
  const teller = personById(story.storyteller_id);
  const about = story.about_person_id && story.about_person_id !== story.storyteller_id ? personById(story.about_person_id) : null;
  const sub = subtopicById(story.category_id, story.subtopic_id);
  const url = useQuery({
    queryKey: ["audio", story.audio_path],
    queryFn: () => audioUrl(story.audio_path!),
    enabled: !!story.audio_path,
    staleTime: 30 * 60_000,
  });
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {categoryById(story.category_id)?.title} · {sub?.title}
        {sub?.shared && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-accent-foreground normal-case tracking-normal">shared memory</span>}
      </div>
      <p className="mt-2 font-display text-xl leading-snug">“{story.question}”</p>
      <div className="mt-2 text-sm text-muted-foreground">
        told by{" "}
        {teller && <Link to="/people/$id" params={{ id: teller.id }} className="text-primary underline-offset-2 hover:underline">{teller.name}</Link>}
        {about && <> about <Link to="/people/$id" params={{ id: about.id }} className="text-primary hover:underline">{about.name}</Link></>}
        {" · "}{new Date(story.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </div>
      {url.data && <audio controls src={url.data} className="mt-4 w-full" />}
      {story.note && <p className="mt-3 whitespace-pre-line text-sm">{story.note}</p>}
    </article>
  );
}
