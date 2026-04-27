import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScanBarcode, Trash2, ShoppingCart, AlertTriangle, Plus, Minus, Printer, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { findMedicineByBarcode, recordSale, useStore, type SaleItem, type PaymentMethod, type Medicine, type Sale } from "@/lib/store";
import { CURRENCY, formatMoney } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/pos")({ component: PosPage });

interface CartLine extends SaleItem {
  requiresPrescription: boolean;
}

function PosPage() {
  const medicines = useStore((s) => s.medicines);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [scannerError, setScannerError] = useState("");
  const [pendingRx, setPendingRx] = useState<Medicine | null>(null);
  
  // ← State لحفظ الفاتورة
  const [invoiceData, setInvoiceData] = useState<Sale | null>(null); 
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep barcode input always focused
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const onClick = () => {
      // ← منع التركيز لو المودال مفتوح
      if (document.activeElement?.tagName !== "INPUT" && !pendingRx && !invoiceData) el.focus();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pendingRx, invoiceData]);

  const addToCart = (med: Medicine) => {
    if (med.quantity <= 0) {
      toast.error(`${med.name} is out of stock`);
      return;
    }
    setCart((c) => {
      const existing = c.find((l) => l.medicineId === med.id);
      if (existing) {
        if (existing.qty + 1 > med.quantity) {
          toast.error(`Only ${med.quantity} available`);
          return c;
        }
        return c.map((l) => (l.medicineId === med.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...c,
        {
          medicineId: med.id,
          medicineName: med.name,
          qty: 1,
          unitPrice: med.sellingPrice,
          unitCost: med.purchasePrice,
          requiresPrescription: med.requiresPrescription,
        },
      ];
    });
    toast.success(`Added ${med.name}`);
  };

  const handleScan = (value: string) => {
    const code = value.trim();
    if (!code) return;
    const med = findMedicineByBarcode(code);
    if (!med) {
      setScannerError(`No medicine found for barcode "${code}"`);
      toast.error(`Barcode not found: ${code}`);
      return;
    }
    setScannerError("");
    if (med.requiresPrescription) {
      setPendingRx(med);
    } else {
      addToCart(med);
    }
  };

  const onBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(barcode);
      setBarcode("");
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return medicines
      .filter((m) => m.name.toLowerCase().includes(q) || m.barcode.includes(q))
      .slice(0, 8);
  }, [search, medicines]);

  const total = cart.reduce((a, l) => a + l.qty * l.unitPrice, 0);

  const updateQty = (id: string, delta: number) => {
    setCart((c) =>
      c
        .map((l) => (l.medicineId === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const checkout = () => {
    if (cart.length === 0) return;
    const res = recordSale({
      items: cart.map(({ requiresPrescription: _r, ...rest }) => rest),
      paymentMethod: payment,
    });
    if (!res.ok) {
      toast.error(res.error || "Sale failed");
      return;
    }
    toast.success(`Sale recorded — ${formatMoney(res.sale!.total)}`);
    setInvoiceData(res.sale!); // ← تشغيل الفاتورة
    setCart([]);
  };

  return (
    <AppShell>
      {/* ← ستايل الطباعة للفاتورة */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; color: black; background: white; padding: 20px;}
        }
      `}</style>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Scanner + search */}
        <div className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScanBarcode className="h-5 w-5 text-primary" /> Barcode Scanner
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Scan or type a barcode and press Enter. Input stays focused for fast continuous scans.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={onBarcodeKey}
                placeholder="Scan barcode here…"
                autoComplete="off"
                className="h-14 text-lg tracking-widest"
              />
              {scannerError && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span>{scannerError}</span>
                  <Button size="sm" variant="ghost" onClick={() => setScannerError("")}>
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual search (fallback)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or barcode…"
              />
              {filtered.length > 0 && (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {filtered.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.barcode} · {m.quantity} boxes · {formatMoney(m.sellingPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.requiresPrescription && (
                          <Badge variant="outline" className="border-warning/50 text-warning">
                            Rx
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (m.requiresPrescription) setPendingRx(m);
                            else addToCart(m);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <Card className="flex h-[calc(100vh-9rem)] flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Cart
              </span>
              <Badge variant="secondary">{cart.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <ShoppingCart className="mb-2 h-8 w-8 opacity-50" />
                  Cart is empty. Scan a barcode to start.
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((l) => (
                    <li
                      key={l.medicineId}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{l.medicineName}</span>
                            {l.requiresPrescription && (
                              <Badge variant="outline" className="border-warning/50 text-warning">
                                Rx
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatMoney(l.unitPrice)} × {l.qty}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{formatMoney(l.qty * l.unitPrice)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.medicineId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{l.qty}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.medicineId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setCart((c) => c.filter((x) => x.medicineId !== l.medicineId))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between text-lg">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold">{formatMoney(total)}</span>
              </div>
              <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="wallet">Mobile Wallet</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0}
                onClick={checkout}
              >
                Charge {formatMoney(total)}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Currency: {CURRENCY}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ← مودال الفاتورة بعد البيع للطباعة */}
      <Dialog open={!!invoiceData} onOpenChange={(open) => {
          if (!open) {
              setInvoiceData(null);
              setTimeout(() => inputRef.current?.focus(), 100);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="print:hidden flex items-center justify-center flex-col space-y-2">
            <CheckCircle2 className="w-12 h-12 text-success" />
            <DialogTitle>Payment Successful</DialogTitle>
          </DialogHeader>
          
          <div id="invoice-print-area" className="p-4 bg-white text-black rounded-md shadow-sm border border-gray-200 font-mono text-sm">
            <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="font-bold text-xl uppercase">CarePlus Pharmacy</h2>
              <p className="text-gray-500 text-xs mt-1">Official Receipt</p>
              <p className="text-gray-500 text-xs mt-1">Order #{invoiceData?.id.replace('sale_', '')}</p>
              <p className="text-gray-500 text-xs">{invoiceData?.ts && new Date(invoiceData.ts).toLocaleString()}</p>
            </div>
            
            <div className="space-y-2 mb-4">
              {invoiceData?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.qty}x {item.medicineName}</span>
                  <span>{formatMoney(item.qty * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-dashed border-gray-300 pt-4 font-bold flex justify-between text-base">
              <span>TOTAL</span>
              <span>{invoiceData && formatMoney(invoiceData.total)}</span>
            </div>
            <div className="text-center text-xs text-gray-500 mt-6 uppercase">
              <p>Method: {invoiceData?.paymentMethod}</p>
              <p className="mt-1">Cashier: {invoiceData?.cashierName}</p>
              <p className="mt-4 font-semibold">Thank you for your visit!</p>
            </div>
          </div>

          <DialogFooter className="print:hidden sm:justify-between mt-4">
            <Button variant="outline" onClick={() => setInvoiceData(null)}>
              New Order
            </Button>
            <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription warning */}
      <Dialog open={!!pendingRx} onOpenChange={(open) => !open && setPendingRx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Prescription required
            </DialogTitle>
            <DialogDescription>
              <strong>{pendingRx?.name}</strong> requires a valid doctor's prescription. Please verify
              the prescription before proceeding with the sale.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRx(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingRx) addToCart(pendingRx);
                setPendingRx(null);
              }}
            >
              Verified — Add to cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}