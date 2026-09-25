import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const storiesQuery = queryOptions({
  queryKey: ["stories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
export type Story = NonNullable<Awaited<ReturnType<NonNullable<typeof storiesQuery.queryFn>>>>[number];

export async function audioUrl(path: string) {
  const { data } = await supabase.storage.from("recordings").createSignedUrl(path, 3600);
  return data?.signedUrl;
}
