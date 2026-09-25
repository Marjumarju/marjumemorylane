import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, MapPin, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { detailsQuery, saveDetails, studyYears, spanLabel, type Study } from "@/lib/details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function DetailsBox({ id, name }: { id: string; name: string }) {
  const { data = [] } = useQuery(detailsQuery);
  const d = data.find((x) => x.person_id === id);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [studies, setStudies] = useState<Study[]>([]);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setCity(d?.city ?? "");
    setStudies(d?.studies.length ? d.studies : [{ what: "", where: "" }]);
    setOpen(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      await saveDetails(id, city, studies);
      await qc.invalidateQueries({ queryKey: ["person_details"] });
      qc.invalidateQueries({ queryKey: ["about", id] });
      setOpen(false);
      toast.success("Details saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-2 text-sm">
      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{d?.city ? <>Lives in <span className="font-medium">{d.city}</span></> : <span className="text-muted-foreground">City not added</span>}</div>
      <div className="flex items-start gap-2"><GraduationCap className="mt-0.5 h-4 w-4 text-primary" />
        {d?.studies.length ? <span>Studied {d.studies.map((s) => [s.what, s.where].filter(Boolean).join(" at ")).join("; ")}</span> : <span className="text-muted-foreground">Studies not added</span>}
      </div>
      <button type="button" onClick={start} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Pencil className="h-3 w-3" /> Edit details</button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{name}'s details</DialogTitle></DialogHeader>
          <label className="text-sm font-medium">Lives in (city)</label>
          <Input value={city} maxLength={100} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Tallinn" />
          <label className="mt-2 text-sm font-medium">Studied</label>
          {studies.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input value={s.what} maxLength={150} placeholder="What (e.g. Marketing)" onChange={(e) => setStudies(studies.map((x, j) => j === i ? { ...x, what: e.target.value } : x))} />
              <Input value={s.where} maxLength={150} placeholder="Where (e.g. Tartu University)" onChange={(e) => setStudies(studies.map((x, j) => j === i ? { ...x, where: e.target.value } : x))} />
              <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setStudies(studies.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setStudies([...studies, { what: "", where: "" }])}><Plus className="h-4 w-4" /> Add another</Button>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
