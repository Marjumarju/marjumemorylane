import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StoryMedia = Tables<"story_media">;

export const STORY_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
export const STORY_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export function validateStoryMedia(file: File): "image" | "video" {
  const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
  if (!type) throw new Error("Choose a photo or a video clip.");
  if (file.size > STORY_MEDIA_MAX_BYTES) throw new Error("Photo or video clips must be smaller than 25 MB.");
  return type;
}

export async function storyMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from("story-media").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadStoryMedia(storyId: string, file: File) {
  const mediaType = validateStoryMedia(file);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (mediaType === "image" ? "jpg" : "mp4");
  const storagePath = `${storyId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("story-media").upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from("story_media").insert({
    story_id: storyId,
    media_type: mediaType,
    storage_path: storagePath,
    original_filename: file.name.slice(0, 255),
  }).select().single();
  if (error) {
    await supabase.storage.from("story-media").remove([storagePath]);
    throw error;
  }
  return data;
}

export async function removeStoryMedia(media: StoryMedia) {
  const { error: storageError } = await supabase.storage.from("story-media").remove([media.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("story_media").delete().eq("id", media.id);
  if (error) throw error;
}