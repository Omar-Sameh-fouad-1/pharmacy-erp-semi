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
    if (!editing.name.trim()) return toast.error("اسم المورد مطلوب");
    const sup: Supplier = { ...editing, id: editing.id || uid("s_"), phones: editing.phones.filter((p) => p.trim()) };
    upsertSupplier(sup);
    toast.success(`تم حفظ بيانات ${sup.name}`);
    setOpen(false); setEditing(null);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">الموردين</h1>
            <p className="text-sm text-muted-foreground">{suppliers.length} مورد مسجل</p>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن مورد..." className="sm:w-64" />
            <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }}>
              <Plus className="ml-2 h-4 w-4" /> إضافة مورد
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
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...s }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(s)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold">{s.name}</div>
                        <Badge variant="secondary" className="mt-0.5">{linkedCount} أدوية مرتبطة</Badge>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Truck className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-right mt-4">
                    {s.phones.map((p, i) => (
                      <div key={i} className="flex flex-row-reverse items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> <span dir="ltr">{p}</span>
                      </div>
                    ))}
                    <div className="flex flex-row-reverse items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {s.address || "بدون عنوان"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="text-right rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل المورد" : "إضافة مورد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>اسم المورد</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>أرقام الهواتف (كل رقم في سطر)</Label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
                  dir="ltr"
                  value={editing.phones.join("\n")}
                  onChange={(e) => setEditing({ ...editing, phones: e.target.value.split("\n") })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>العنوان</Label>
                <Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={save}>حفظ البيانات</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent className="text-right rtl">
          <DialogHeader>
            <DialogTitle>حذف {confirmDel?.name}؟</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">الأدوية المرتبطة بهذا المورد ستصبح بدون مورد.</p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={() => { if (confirmDel) { deleteSupplier(confirmDel.id); toast.success("تم الحذف"); setConfirmDel(null); } }}>حذف</Button>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}