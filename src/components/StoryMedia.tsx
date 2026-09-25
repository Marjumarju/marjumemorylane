import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeStoryMedia, STORY_MEDIA_ACCEPT, storyMediaUrl, uploadStoryMedia, validateStoryMedia, type StoryMedia as StoryMediaRow } from "@/lib/story-media";

export function StoryMedia({ storyId, media }: { storyId: string; media?: StoryMediaRow | null }) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const url = useQuery({
    queryKey: ["story-media-url", media?.storage_path],
    queryFn: () => storyMediaUrl(media?.storage_path ?? ""),
    enabled: !!media?.storage_path,
    staleTime: 30 * 60_000,
  });
  const change = useMutation({
    mutationFn: async (file: File) => {
      validateStoryMedia(file);
      const old = media;
      await uploadStoryMedia(storyId, file);
      if (old) await removeStoryMedia(old);
    },
    onSuccess: () => {
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success(media ? "Media replaced" : "Media added");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't save the media"),
  });
  const remove = useMutation({
    mutationFn: () => media ? removeStoryMedia(media) : Promise.resolve(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Media removed");
    },
    onError: () => toast.error("Couldn't remove the media"),
  });

  return (
    <div className="mt-4">
      {url.data && media?.media_type === "image" && (
        <img src={url.data} alt={`Attached to this story: ${media.original_filename}`} className="max-h-[30rem] w-full rounded-md object-cover" />
      )}
      {url.data && media?.media_type === "video" && (
        <video src={url.data} controls preload="metadata" className="max-h-[30rem] w-full rounded-md bg-foreground" />
      )}
      {preview && <p className="mt-2 truncate text-xs text-muted-foreground">Ready to add: {preview}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={STORY_MEDIA_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try { validateStoryMedia(file); setPreview(file.name); change.mutate(file); }
            catch (error) { toast.error(error instanceof Error ? error.message : "Choose another file"); }
            event.target.value = "";
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={change.isPending || remove.isPending} onClick={() => input.current?.click()}>
          {media ? <Pencil className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
          {change.isPending ? "Saving…" : media ? "Replace media" : "Add photo or video"}
        </Button>
        {media && (
          <Button type="button" size="sm" variant="ghost" disabled={change.isPending || remove.isPending} onClick={() => remove.mutate()}>
            <Trash2 className="h-4 w-4" /> {remove.isPending ? "Removing…" : "Remove media"}
          </Button>
        )}
      </div>
    </div>
  );
}