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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteMedicine, upsertMedicine, useStore, uid, type Medicine } from "@/lib/store";
import { formatMoney, daysUntil, LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

const empty: Medicine = {
  id: "",
  name: "",
  barcode: "",
  expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  quantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  requiresPrescription: false,
  supplierId: null,
  createdAt: "",
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

  const openNew = () => {
    setEditing({ ...empty });
    setOpen(true);
  };

  const openEdit = (m: Medicine) => {
    setEditing({ ...m });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Name required");
    if (!editing.barcode.trim()) return toast.error("Barcode required");
    if (editing.quantity < 0) return toast.error("Quantity invalid");
    const med: Medicine = {
      ...editing,
      id: editing.id || uid("m_"),
      createdAt: editing.createdAt || new Date().toISOString(),
    };
    const res = upsertMedicine(med);
    if (!res.ok) return toast.error(res.error || "Failed");
    toast.success(`${med.name} saved`);
    setOpen(false);
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground">{medicines.length} medicines in catalog</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or barcode…"
              className="sm:w-72"
            />
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Add Medicine
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Barcode</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Buy / Sell</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((m) => {
                    const days = daysUntil(m.expiryDate);
                    const low = m.quantity <= LOW_STOCK_THRESHOLD;
                    const near = days <= NEAR_EXPIRY_DAYS;
                    const expired = days < 0;
                    const sup = suppliers.find((s) => s.id === m.supplierId);
                    return (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Pill className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-medium">{m.name}</div>
                              {m.requiresPrescription && (
                                <Badge variant="outline" className="mt-0.5 border-warning/50 text-warning">
                                  Rx required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{m.barcode}</td>
                        <td className="px-4 py-3">
                          <span className={low ? "font-semibold text-destructive" : ""}>
                            {m.quantity}
                          </span>
                          {low && <Badge variant="destructive" className="ml-2">Low</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className={expired ? "text-destructive" : near ? "text-warning" : ""}>
                            {m.expiryDate}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {expired ? `Expired ${Math.abs(days)}d ago` : `${days} days`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>{formatMoney(m.purchasePrice)}</div>
                          <div className="font-medium text-foreground">{formatMoney(m.sellingPrice)}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sup?.name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDel(m)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No medicines found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode (unique)</Label>
                <Input value={editing.barcode} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry date</Label>
                <Input type="date" value={editing.expiryDate} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity (boxes)</Label>
                <Input type="number" min={0} value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select
                  value={editing.supplierId || "none"}
                  onValueChange={(v) => setEditing({ ...editing, supplierId: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Purchase price</Label>
                <Input type="number" min={0} step="0.01" value={editing.purchasePrice} onChange={(e) => setEditing({ ...editing, purchasePrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling price</Label>
                <Input type="number" min={0} step="0.01" value={editing.sellingPrice} onChange={(e) => setEditing({ ...editing, sellingPrice: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                <div>
                  <Label>Requires prescription</Label>
                  <p className="text-xs text-muted-foreground">Pharmacist must verify Rx before sale</p>
                </div>
                <Switch checked={editing.requiresPrescription} onCheckedChange={(v) => setEditing({ ...editing, requiresPrescription: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDel?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDel) {
                  deleteMedicine(confirmDel.id);
                  toast.success("Medicine deleted");
                  setConfirmDel(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}