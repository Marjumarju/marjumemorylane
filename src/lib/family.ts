import data from "@/data/family.json";
import marjuPhoto from "@/assets/marju.jpg";
import mathisPhoto from "@/assets/mathis.png";
import kalmerPhoto from "@/assets/kalmer.png";
import enePhoto from "@/assets/ene.png";
import liisPhoto from "@/assets/liis.png";
import jaanikaPhoto from "@/assets/jaanika.png";
import martinPhoto from "@/assets/martin.png";
import tanelPhoto from "@/assets/tanel.webp";

export type Person = {
  id: string;
  name: string;
  birth_year: number;
  role?: string;
  parents: string[];
  tells_stories: "self" | "with_help" | "told_by_family";
};
export type Subtopic = { id: string; title: string; shared: boolean; example_question: string; who?: string };
export type Category = { id: string; title: string; description: string; who: string; repeat?: string; subtopics: Subtopic[] };

export const app = data as unknown as {
  app: string;
  purpose: string;
  family_tree: { people: Person[]; partnerships: { partners: string[]; type: string }[] };
  categories: Category[];
  follow_up_prompts: string[];
  generation_context: Record<string, string>;
};

export const people = app.family_tree.people;

/** Family photos by person id; anyone without one shows their initial instead. */
export const photos: Partial<Record<string, string>> = {
  martin: martinPhoto,
  tanel: tanelPhoto,
  jaanika: jaanikaPhoto,
  liis: liisPhoto,
  ene: enePhoto,
  kalmer: kalmerPhoto,
  marju: marjuPhoto,
  mathis: mathisPhoto,
};
export const categories = app.categories;
export const partnerships = app.family_tree.partnerships;
export const followUps = app.follow_up_prompts;

export const personById = (id?: string | null) => people.find((p) => p.id === id);
export const childrenOf = (id: string) => people.filter((p) => p.parents.includes(id));
export const partnerOf = (id: string) => {
  const ps = partnerships.find((p) => p.partners.includes(id));
  return ps ? personById(ps.partners.find((x) => x !== id)) : undefined;
};

export function generation(p: Person): 1 | 2 | 3 {
  if (p.parents.length === 0) {
    // married-in partners sit in their partner's generation
    const partner = partnerOf(p.id);
    if (partner && partner.parents.length > 0) return (generation(partner) as 1 | 2 | 3);
    return 1;
  }
  const parent = personById(p.parents[0]);
  return parent ? ((Math.min(3, generation(parent) + 1)) as 1 | 2 | 3) : 1;
}

export const CURRENT_YEAR = 2026;
export const ageOf = (p: Person) => CURRENT_YEAR - p.birth_year;
const isAdult = (p: Person) => ageOf(p) >= 18;

function fits(who: string | undefined, teller: Person, about: Person): boolean {
  if (!who) return true;
  switch (who) {
    case "everyone": return true;
    case "adults": return isAdult(teller) && about.id === teller.id;
    case "remember_soviet_times": return teller.birth_year <= 1986 && about.id === teller.id;
    case "parents": return childrenOf(teller.id).length > 0;
    case "couples": return !!partnerOf(teller.id);
    case "generation_3": return generation(about) === 3;
    case "kids_with_help": return about.id === teller.id && generation(teller) === 3 && teller.tells_stories !== "told_by_family";
    case "family_about_child": return about.id !== teller.id && generation(about) === 3 && isAdult(teller);
    default: return true;
  }
}

/** Topics a storyteller can answer, optionally about someone else (a little one). */
export function topicsFor(teller: Person, about: Person = teller) {
  return categories
    .filter((c) => fits(c.who, teller, about))
    .map((c) => ({ ...c, subtopics: c.subtopics.filter((s) => fits(s.who ?? (c.who === "adults" ? undefined : undefined), teller, about) && (about.id === teller.id || s.who === "family_about_child")) }))
    .filter((c) => c.subtopics.length > 0);
}

export const tellers = people.filter((p) => p.tells_stories !== "told_by_family");
export const categoryById = (id: string) => categories.find((c) => c.id === id);
export const subtopicById = (cid: string, sid: string) => categoryById(cid)?.subtopics.find((s) => s.id === sid);
