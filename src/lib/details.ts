import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Study = { what: string; where: string };
export type PersonDetails = { person_id: string; city: string | null; studies: Study[]; updated_at: string };

export const detailsQuery = queryOptions({
  queryKey: ["person_details"],
  queryFn: async (): Promise<PersonDetails[]> => {
    const { data, error } = await supabase.from("person_details").select("*");
    if (error) throw error;
    return (data ?? []).map((d) => ({ ...d, studies: (d.studies as Study[] | null) ?? [] }));
  },
});

export async function saveDetails(personId: string, city: string, studies: Study[]) {
  const { error } = await supabase.from("person_details").upsert({
    person_id: personId,
    city: city.trim().slice(0, 100) || null,
    studies: studies
      .map((s) => ({ what: s.what.trim().slice(0, 150), where: s.where.trim().slice(0, 150) }))
      .filter((s) => s.what || s.where),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
