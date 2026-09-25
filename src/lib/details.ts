import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Study = { what: string; where: string; from_year?: number | null; to_year?: number | null };
export type PersonDetails = { person_id: string; city: string | null; studies: Study[]; updated_at: string };

export const detailsQuery = queryOptions({
  queryKey: ["person_details"],
  queryFn: async (): Promise<PersonDetails[]> => {
    const { data, error } = await supabase.from("person_details").select("*");
    if (error) throw error;
    return (data ?? []).map((d) => ({ ...d, studies: (d.studies as Study[] | null) ?? [] }));
  },
});

const yr = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 1800 && n < 2200 ? n : null;
};

export function studyYears(s: Study) {
  if (s.from_year && s.to_year) return s.from_year === s.to_year ? `${s.from_year}` : `${s.from_year}–${s.to_year}`;
  return s.from_year ? `${s.from_year}–` : s.to_year ? `until ${s.to_year}` : "";
}

export function spanLabel(from?: number | null, to?: number | null) {
  if (!from || !to || to < from) return "";
  const n = to - from;
  return n <= 0 ? "" : `${n} ${n === 1 ? "year" : "years"}`;
}

export async function saveDetails(personId: string, city: string, studies: Study[]) {
  const { error } = await supabase.from("person_details").upsert({
    person_id: personId,
    city: city.trim().slice(0, 100) || null,
    studies: studies
      .map((s) => ({ what: s.what.trim().slice(0, 150), where: s.where.trim().slice(0, 150), from_year: yr(s.from_year), to_year: yr(s.to_year) }))
      .filter((s) => s.what || s.where),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
