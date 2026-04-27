import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Pill } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { deleteMedicine, upsertMedicine, useStore, uid, type Medicine } from "@/lib/store";
import { formatMoney, daysUntil, LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

const empty: Medicine = {
  id: "", name: "", barcode: "", expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  quantity: 0, purchasePrice: 0, sellingPrice: 0, requiresPrescription: false, supplierIds: [], createdAt: "",
};

function InventoryPage() {
  const medicines = useStore((s) => s.medicines);
  const suppliers = useStore((s) => s.suppliers);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Medicine | null>(null);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return medicines
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.barcode.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, search]);

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (m: Medicine) => { setEditing({ ...m }); setOpen(true); };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("اسم الدواء مطلوب");
    if (!editing.barcode.trim()) return toast.error("الباركود مطلوب");
    if (editing.quantity < 0) return toast.error("الكمية غير صحيحة");
    const med: Medicine = { ...editing, id: editing.id || uid("m_"), createdAt: editing.createdAt || new Date().toISOString() };
    const res = upsertMedicine(med);
    if (!res.ok) return toast.error(res.error || "حدث خطأ");
    toast.success(`تم حفظ ${med.name}`);
    setOpen(false); setEditing(null);
  };

  return (
    <AppShell>
      <div className="space-y-4 text-right" dir="rtl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">المخزن</h1>
            <p className="text-sm text-muted-foreground">{medicines.length} صنف مسجل في الكتالوج</p>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الباركود..." className="sm:w-72 text-right" />
            <Button onClick={openNew}>
              <Plus className="ml-2 h-4 w-4" /> إضافة دواء
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">الدواء</th>
                    <th className="px-4 py-3">الباركود</th>
                    <th className="px-4 py-3">الكمية</th>
                    <th className="px-4 py-3">الصلاحية</th>
                    <th className="px-4 py-3">شراء / بيع</th>
                    <th className="px-4 py-3">الموردين</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((m) => {
                    const days = daysUntil(m.expiryDate);
                    const low = m.quantity <= LOW_STOCK_THRESHOLD;
                    const near = days <= NEAR_EXPIRY_DAYS;
                    const expired = days < 0;
                    // تجميع أسماء الموردين
                    const supNames = m.supplierIds?.map(id => suppliers.find(s => s.id === id)?.name).filter(Boolean).join("، ") || "—";
                    return (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Pill className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-medium text-right">{m.name}</div>
                              {m.requiresPrescription && <Badge variant="outline" className="mt-0.5 border-warning/50 text-warning">روشتة</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{m.barcode}</td>
                        <td className="px-4 py-3">
                          <span className={low ? "font-semibold text-destructive" : ""}>{m.quantity}</span>
                          {low && <Badge variant="destructive" className="mr-2">نواقص</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={expired ? "text-destructive font-bold" : near ? "text-warning font-semibold" : ""}>{m.expiryDate}</div>
                          <div className="text-xs text-muted-foreground">{expired ? `منتهي من ${Math.abs(days)} يوم` : `باقي ${days} يوم`}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{formatMoney(m.purchasePrice)}</div>
                          <div className="font-medium text-foreground">{formatMoney(m.sellingPrice)}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate" title={supNames}>{supNames}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">لا يوجد أدوية</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-xl text-right rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل بيانات الدواء" : "إضافة دواء جديد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>اسم الدواء</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الباركود (فريد)</Label>
                <Input value={editing.barcode} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} dir="ltr" className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الصلاحية</Label>
                <Input type="date" value={editing.expiryDate} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الكمية (بالعلبة)</Label>
                <Input type="number" min={0} value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} />
              </div>
              
              {/* ← تعديل الموردين المتعددين */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>الموردين (يمكن اختيار أكثر من مورد)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border p-3 rounded-md bg-muted/20 max-h-32 overflow-y-auto">
                  {suppliers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-primary"
                        checked={(editing.supplierIds || []).includes(s.id)}
                        onChange={(e) => {
                           const current = editing.supplierIds || [];
                           const updated = e.target.checked ? [...current, s.id] : current.filter(id => id !== s.id);
                           setEditing({ ...editing, supplierIds: updated });
                        }}
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                  {suppliers.length === 0 && <span className="text-xs text-muted-foreground">لا يوجد موردين مسجلين</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>سعر الشراء</Label>
                <Input type="number" min={0} step="0.01" value={editing.purchasePrice} onChange={(e) => setEditing({ ...editing, purchasePrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>سعر البيع</Label>
                <Input type="number" min={0} step="0.01" value={editing.sellingPrice} onChange={(e) => setEditing({ ...editing, sellingPrice: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                <div>
                  <Label>يصرف بروشتة طبية</Label>
                  <p className="text-xs text-muted-foreground">يجب على الصيدلي التحقق من الروشتة قبل البيع</p>
                </div>
                <Switch checked={editing.requiresPrescription} onCheckedChange={(v) => setEditing({ ...editing, requiresPrescription: v })} />
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
        <DialogContent className="text-right rtl" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف {confirmDel?.name}؟</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">لا يمكن التراجع عن هذه الخطوة.</p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={() => { if (confirmDel) { deleteMedicine(confirmDel.id); toast.success("تم الحذف"); setConfirmDel(null); } }}>حذف</Button>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}