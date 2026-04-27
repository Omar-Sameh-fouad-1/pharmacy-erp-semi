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
  
  const [invoiceData, setInvoiceData] = useState<Sale | null>(null); 
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const onClick = () => {
      if (document.activeElement?.tagName !== "INPUT" && !pendingRx && !invoiceData) el.focus();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pendingRx, invoiceData]);

  const addToCart = (med: Medicine) => {
    if (med.quantity <= 0) {
      toast.error(`الدواء ${med.name} نفد من المخزون`);
      return;
    }
    setCart((c) => {
      const existing = c.find((l) => l.medicineId === med.id);
      if (existing) {
        if (existing.qty + 1 > med.quantity) {
          toast.error(`المتاح فقط ${med.quantity} علبة`);
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
    toast.success(`تمت إضافة ${med.name}`);
  };

  const handleScan = (value: string) => {
    const code = value.trim();
    if (!code) return;
    const med = findMedicineByBarcode(code);
    if (!med) {
      setScannerError(`لا يوجد دواء بهذا الباركود: "${code}"`);
      toast.error(`باركود غير معروف: ${code}`);
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
      toast.error(res.error || "فشلت عملية البيع");
      return;
    }
    toast.success(`تم تسجيل البيع بنجاح — ${formatMoney(res.sale!.total)}`);
    setInvoiceData(res.sale!);
    setCart([]);
  };

  return (
    <AppShell>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; right: 0; top: 0; width: 100%; color: black; background: white; padding: 20px; direction: rtl;}
        }
      `}</style>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px] text-right rtl">
        <div className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base justify-end">
                 قارئ الباركود <ScanBarcode className="h-5 w-5 text-primary" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                امسح الباركود أو اكتبه واضغط Enter. سيظل حقل الإدخال نشطاً للمسح المستمر.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={onBarcodeKey}
                placeholder="امسح الباركود هنا..."
                autoComplete="off"
                className="h-14 text-lg tracking-widest text-right"
                dir="ltr"
              />
              {scannerError && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex-row-reverse">
                  <span>{scannerError}</span>
                  <Button size="sm" variant="ghost" onClick={() => setScannerError("")}>
                    إغلاق
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-right">بحث يدوي (بديل)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الباركود..."
                className="text-right"
                dir="rtl"
              />
              {filtered.length > 0 && (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {filtered.map((m) => (
                    <li key={m.id} className="flex items-center justify-between p-3 text-sm flex-row-reverse">
                      <div className="text-right">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.barcode} · {m.quantity} علبة · {formatMoney(m.sellingPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {m.requiresPrescription && (
                          <Badge variant="outline" className="border-warning/50 text-warning">
                            روشتة
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (m.requiresPrescription) setPendingRx(m);
                            else addToCart(m);
                          }}
                        >
                          إضافة
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
            <CardTitle className="flex items-center justify-between text-base flex-row-reverse">
              <span className="flex items-center gap-2">
                 سلة المشتريات <ShoppingCart className="h-5 w-5" />
              </span>
              <Badge variant="secondary">{cart.length} أصناف</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex-1 overflow-y-auto pl-1">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <ShoppingCart className="mb-2 h-8 w-8 opacity-50" />
                  السلة فارغة. امسح باركود للبدء.
                </div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((l) => (
                    <li
                      key={l.medicineId}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex items-start justify-between gap-2 flex-row-reverse">
                        <div className="min-w-0 flex-1 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="truncate text-sm font-medium">{l.medicineName}</span>
                            {l.requiresPrescription && (
                              <Badge variant="outline" className="border-warning/50 text-warning">
                                روشتة
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatMoney(l.unitPrice)} × {l.qty}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-left">{formatMoney(l.qty * l.unitPrice)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between flex-row-reverse">
                        <div className="flex items-center gap-1 flex-row-reverse">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.medicineId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{l.qty}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.medicineId, -1)}>
                            <Minus className="h-3 w-3" />
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
              <div className="flex items-center justify-between text-lg flex-row-reverse">
                <span className="text-sm text-muted-foreground">الإجمالي</span>
                <span className="font-bold">{formatMoney(total)}</span>
              </div>
              <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                <SelectTrigger dir="rtl"><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="cash">نقدي (كاش)</SelectItem>
                  <SelectItem value="card">بطاقة بنكية (فيزا)</SelectItem>
                  <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                  <SelectItem value="insurance">تأمين طبي</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0}
                onClick={checkout}
              >
                دفع {formatMoney(total)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!invoiceData} onOpenChange={(open) => {
          if (!open) {
              setInvoiceData(null);
              setTimeout(() => inputRef.current?.focus(), 100);
          }
      }}>
        <DialogContent className="sm:max-w-md text-right rtl" dir="rtl">
          <DialogHeader className="print:hidden flex items-center justify-center flex-col space-y-2">
            <CheckCircle2 className="w-12 h-12 text-success" />
            <DialogTitle>تمت عملية الدفع بنجاح</DialogTitle>
          </DialogHeader>
          
          <div id="invoice-print-area" className="p-4 bg-white text-black rounded-md shadow-sm border border-gray-200 font-mono text-sm text-right" dir="rtl">
            <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="font-bold text-xl uppercase">صيدلية كير بلس</h2>
              <p className="text-gray-500 text-xs mt-1">فاتورة مبيعات رسمية</p>
              <p className="text-gray-500 text-xs mt-1">طلب #{invoiceData?.id.replace('sale_', '')}</p>
              <p className="text-gray-500 text-xs">{invoiceData?.ts && new Date(invoiceData.ts).toLocaleString('ar-EG')}</p>
            </div>
            
            <div className="space-y-2 mb-4">
              {invoiceData?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between flex-row-reverse">
                  <span>{item.qty}x {item.medicineName}</span>
                  <span>{formatMoney(item.qty * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-dashed border-gray-300 pt-4 font-bold flex justify-between text-base flex-row-reverse">
              <span>الإجمالي</span>
              <span>{invoiceData && formatMoney(invoiceData.total)}</span>
            </div>
            <div className="text-center text-xs text-gray-500 mt-6">
              <p>طريقة الدفع: {invoiceData?.paymentMethod === 'cash' ? 'نقدي' : invoiceData?.paymentMethod === 'card' ? 'فيزا' : invoiceData?.paymentMethod === 'wallet' ? 'محفظة' : 'تأمين'}</p>
              <p className="mt-1">الكاشير: {invoiceData?.cashierName}</p>
              <p className="mt-4 font-semibold">شكراً لزيارتكم! نتمنى لكم الشفاء العاجل.</p>
            </div>
          </div>

          <DialogFooter className="print:hidden flex-row-reverse justify-between mt-4">
            <Button variant="outline" onClick={() => setInvoiceData(null)}>
              طلب جديد
            </Button>
            <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-row-reverse">
              طباعة الفاتورة <Printer className="w-4 h-4" /> 
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingRx} onOpenChange={(open) => !open && setPendingRx(null)}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
               مطلوب روشتة طبية <AlertTriangle className="h-5 w-5 text-warning" />
            </DialogTitle>
            <DialogDescription className="text-right">
              الدواء <strong>{pendingRx?.name}</strong> يتطلب وصفة طبية صالحة (روشتة). يرجى التحقق من الروشتة قبل إتمام عملية البيع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={() => {
                if (pendingRx) addToCart(pendingRx);
                setPendingRx(null);
              }}
            >
              تم التحقق — إضافة للسلة
            </Button>
            <Button variant="outline" onClick={() => setPendingRx(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}