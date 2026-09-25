import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { categoryById, personById, subtopicById } from "@/lib/family";
import { audioUrl, type Story } from "@/lib/stories";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function StoryCard({ story }: { story: Story }) {
  const teller = personById(story.storyteller_id);
  const about = story.about_person_id && story.about_person_id !== story.storyteller_id ? personById(story.about_person_id) : null;
  const sub = subtopicById(story.category_id, story.subtopic_id);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const url = useQuery({
    queryKey: ["audio", story.audio_path],
    queryFn: () => audioUrl(story.audio_path!),
    enabled: !!story.audio_path,
    staleTime: 30 * 60_000,
  });
  const del = useMutation({
    mutationFn: async () => {
      if (story.audio_path) {
        const { error } = await supabase.storage.from("recordings").remove([story.audio_path]);
        if (error) throw error;
      }
      const { error } = await supabase.from("stories").delete().eq("id", story.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Couldn't delete the story — please try again"),
  });

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {categoryById(story.category_id)?.title} · {sub?.title}
          {sub?.shared && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-accent-foreground normal-case tracking-normal">shared memory</span>}
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            aria-label="Delete this story"
            className="text-muted-foreground transition hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Delete forever?</span>
            <Button size="sm" variant="destructive" disabled={del.isPending} onClick={() => del.mutate()}>
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button size="sm" variant="ghost" disabled={del.isPending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
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
