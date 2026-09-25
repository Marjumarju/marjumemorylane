import { CalendarDays } from "lucide-react";
import { photos, personById, subtopicById, type Category } from "@/lib/family";
import type { Story } from "@/lib/stories";
import { StoryCard } from "@/components/StoryCard";

export function TopicStoryTimeline({ category, stories }: { category: Category; stories: Story[] }) {
  const groups = category.subtopics
    .map((subtopic) => ({ subtopic, stories: stories.filter((story) => story.subtopic_id === subtopic.id) }))
    .filter((group) => group.stories.length > 0);

  return (
    <section className="mt-8" aria-labelledby="topic-timeline-title">
      <div className="border-b border-border pb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Topic timeline · {stories.length} {stories.length === 1 ? "story" : "stories"}</p>
        <h2 id="topic-timeline-title" className="mt-1 font-display text-4xl">{category.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{category.description}</p>
      </div>
      <div className="mt-7 space-y-10">
        {groups.map(({ subtopic, stories: entries }) => (
          <section key={subtopic.id}>
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="font-display text-2xl">{subtopic.title}</h3>
              <span className="text-xs text-muted-foreground">{entries.length}</span>
            </div>
            <div className="relative ml-4 border-l border-border pl-7 sm:ml-8 sm:pl-10">
              {entries.map((story) => {
                const teller = personById(story.storyteller_id);
                const photo = teller ? photos[teller.id] : undefined;
                return (
                  <div key={story.id} className="relative mb-7 last:mb-0">
                    <div className="absolute -left-[2.2rem] top-4 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-secondary text-xs font-semibold sm:-left-[3.55rem]">
                      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : teller?.name[0]}
                    </div>
                    <StoryCard story={story} hideTopic />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}