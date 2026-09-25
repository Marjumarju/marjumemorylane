import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTimeline } from "@/lib/timeline.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = { id?: string; year: number | null; label: string; place: string | null; story_id?: string | null; source?: string };

export function TimelineBox({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const key = ["timeline", id];
  const { data: rows = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("person_timeline").select("*").eq("person_id", id);
      if (error) throw error;
      return [...data].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    },
  });
  const [edit, setEdit] = useState<Row | null>(null);
  const extract = useServerFn(extractTimeline);
  const update = useMutation({
    mutationFn: () => extract({ data: { personId: id } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: key }); toast.success(r.added ? `Added ${r.added} events` : "Nothing new found"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update"),
  });

  async function save() {
    if (!edit?.label.trim()) return;
    const row = { person_id: id, year: edit.year, label: edit.label.trim(), place: edit.place?.trim() || null, source: "manual" };
    const { error } = edit.id
      ? await supabase.from("person_timeline").update(row).eq("id", edit.id)
      : await supabase.from("person_timeline").insert(row);
    if (error) return toast.error(error.message);
    setEdit(null);
    qc.invalidateQueries({ queryKey: key });
  }
  async function remove(rid: string) {
    const { error } = await supabase.from("person_timeline").delete().eq("id", rid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{name}'s timeline</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate()}>
            <RefreshCw className={`h-4 w-4 ${update.isPending ? "animate-spin" : ""}`} /> Update from stories
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEdit({ year: null, label: "", place: null })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No events yet. Tap "Update from stories" or add one yourself.</p>
      ) : (
        <ol className="relative mt-4 ml-2 border-l-2 border-primary/30">
          {rows.map((r) => (
            <li key={r.id} className="group relative mb-4 pl-5">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-primary" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-display text-lg text-primary">{r.year ?? "—"}</span>{" "}
                  <span>{r.label}</span>
                  {r.place && <span className="text-muted-foreground"> · {r.place}</span>}
                  {r.source === "story" && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">from a story</span>}
                </div>
                <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                  <button aria-label="Edit" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Remove" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Edit event" : "Add event"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <Input type="number" placeholder="Year" value={edit.year ?? ""} onChange={(e) => setEdit({ ...edit, year: e.target.value ? Number(e.target.value) : null })} />
              <Input placeholder="What happened (e.g. Moved to Lisbon)" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
              <Input placeholder="Place (optional)" value={edit.place ?? ""} onChange={(e) => setEdit({ ...edit, place: e.target.value })} />
            </div>
          )}
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
