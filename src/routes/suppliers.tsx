import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Truck, Phone, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { deleteSupplier, upsertSupplier, useStore, uid, type Supplier } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/suppliers")({ component: SuppliersPage });

const empty: Supplier = { id: "", name: "", phones: [""], address: "" };

function SuppliersPage() {
  const suppliers = useStore((s) => s.suppliers);
  const medicines = useStore((s) => s.medicines);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Supplier | null>(null);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  }, [suppliers, search]);

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Name required");
    const sup: Supplier = {
      ...editing,
      id: editing.id || uid("s_"),
      phones: editing.phones.filter((p) => p.trim()),
    };
    upsertSupplier(sup);
    toast.success(`${sup.name} saved`);
    setOpen(false);
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-sm text-muted-foreground">{suppliers.length} supplier(s)</p>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="sm:w-64" />
            <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const linkedCount = medicines.filter((m) => m.supplierId === s.id).length;
            return (
              <Card key={s.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Truck className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <Badge variant="secondary" className="mt-0.5">{linkedCount} medicines</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...s }); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {s.phones.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {p}
                      </div>
                    ))}
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {s.address || "No address"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone numbers (one per line)</Label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.phones.join("\n")}
                  onChange={(e) => setEditing({ ...editing, phones: e.target.value.split("\n") })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDel?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Linked medicines will be unassigned.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (confirmDel) { deleteSupplier(confirmDel.id); toast.success("Deleted"); setConfirmDel(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}