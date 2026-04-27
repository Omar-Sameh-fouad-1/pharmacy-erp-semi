import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ReceiptText, History, CalendarDays, Printer, Lock, UserCheck, Undo2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore, processReturn, processItemReturn, type Sale, type AuditLog } from "@/lib/store";
import { formatMoney } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/audit")({ component: AuditPage });

function AuditPage() {
  const navigate = useNavigate();
  const logs = useStore((s) => s.auditLogs);
  const sales = useStore((s) => s.sales);
  const returns = useStore((s) => s.returns || []);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const me = users.find((u) => u.id === currentUserId);
  
  const [q, setQ] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (me && me.role !== "admin") navigate({ to: "/" });
  }, [me, navigate]);

  const calculateShift = (logoutLog: AuditLog) => {
    if (!logoutLog.action.includes("logout")) return null;
    
    const loginLog = logs.find(l => 
      l.actorId === logoutLog.actorId && 
      l.action.includes("login") && 
      new Date(l.ts) < new Date(logoutLog.ts)
    );

    if (!loginLog) return null;

    const durationMs = new Date(logoutLog.ts).getTime() - new Date(loginLog.ts).getTime();
    return durationMs / (1000 * 60 * 60); 
  };

  const logCategories = useMemo(() => {
    const t = q.toLowerCase();
    const filtered = logs.filter((l) => 
      l.action.toLowerCase().includes(t) || 
      (l.details || "").toLowerCase().includes(t) ||
      l.actorName.toLowerCase().includes(t)
    );

    return {
      auth: filtered.filter(l => l.action.startsWith('auth.')),
      closing: filtered.filter(l => l.action.includes('close_day') || l.action.includes('payments')),
      system: filtered.filter(l => !l.action.startsWith('auth.') && !l.action.includes('close_day')),
    };
  }, [logs, q]);

  const filteredSales = useMemo(() => {
    const t = q.toLowerCase();
    return sales.filter((s) => s.id.toLowerCase().includes(t) || s.cashierName.toLowerCase().includes(t));
  }, [sales, q]);

  const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);

  // دالة الإرجاع الجزئي (صنف معين)
  const handleReturnItem = (medicineId: string, medicineName: string) => {
    if (!selectedSale) return;
    if (confirm(`هل أنت متأكد من إرجاع الصنف "${medicineName}" للمخزن؟ سيتم خصمه من إجمالي الفاتورة.`)) {
       const res = processItemReturn(selectedSale.id, medicineId);
       if (res.ok) {
          toast.success(`تم إرجاع "${medicineName}" بنجاح`);
          const updatedItems = selectedSale.items.filter(i => i.medicineId !== medicineId);
          if (updatedItems.length === 0) {
            setSelectedSale(null); // قفل الفاتورة لو دي كانت آخر حاجة فيها
          } else {
            const itemToReturn = selectedSale.items.find(i => i.medicineId === medicineId)!;
            setSelectedSale({
              ...selectedSale,
              items: updatedItems,
              total: selectedSale.total - (itemToReturn.qty * itemToReturn.unitPrice)
            });
          }
       } else {
          toast.error(res.error);
       }
    }
  };

  // دالة إرجاع الفاتورة كاملة
  const handleReturnFullSale = () => {
    if(!selectedSale) return;
    if(confirm("هل أنت متأكد من إرجاع هذه الفاتورة بالكامل للمخزن؟")){
       const res = processReturn(selectedSale.id);
       if(res.ok) {
          toast.success("تم إرجاع الفاتورة للمخزن بنجاح");
          setSelectedSale(null);
       } else {
          toast.error(res.error);
       }
    }
  }

  return (
    <AppShell>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reprint-area, #reprint-area * { visibility: visible; }
          #reprint-area { position: absolute; right: 0; top: 0; width: 100%; color: black; background: white; padding: 20px; direction: rtl;}
        }
      `}</style>

      <div className="space-y-6 text-right rtl" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary justify-end">
               مركز الإدارة والمراقبة <ShieldAlert className="h-6 w-6" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">تتبع مفصل لنشاط الموظفين وحركة المبيعات</p>
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث باسم الموظف أو الحدث..." className="max-w-sm text-right" />
        </div>

        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="flex w-full overflow-x-auto justify-start border-b rounded-none bg-transparent h-auto p-0 gap-6" dir="rtl">
            <TabsTrigger value="sales" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">المبيعات اليومية</TabsTrigger>
            <TabsTrigger value="returns" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full text-destructive">المرتجعات</TabsTrigger>
            <TabsTrigger value="auth" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">حضور الموظفين</TabsTrigger>
            <TabsTrigger value="closing" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">إغلاق اليوم (التقفيل)</TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">سجلات النظام</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-4 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-success/20 bg-success/5">
                    <CardContent className="p-6 text-right">
                        <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
                        <p className="text-3xl font-bold">{formatMoney(totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-6 text-right">
                        <p className="text-sm font-medium text-muted-foreground">عدد فواتير اليوم</p>
                        <p className="text-3xl font-bold">{filteredSales.length}</p>
                    </CardContent>
                </Card>
            </div>
            <LogList items={filteredSales} type="sales" onPrint={setSelectedSale} />
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <LogList items={returns} type="returns" icon={<Undo2 className="w-4 h-4 text-destructive" />} />
          </TabsContent>

          <TabsContent value="auth" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {logCategories.auth.map((l) => {
                    const hoursWorked = calculateShift(l);
                    const user = users.find(u => u.id === l.actorId);
                    const targetHours = user?.dailyHours || 8; 
                    const isCompleted = hoursWorked !== null && hoursWorked >= targetHours;

                    return (
                      <li key={l.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors flex-row-reverse">
                        <div className="flex items-center gap-4 flex-row-reverse">
                          <div className={`p-2 rounded-full ${l.action.includes('login') ? 'bg-green-600/10 text-green-600' : 'bg-red-600/10 text-red-600'}`}>
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold uppercase">{l.action === 'auth.login' ? 'تسجيل دخول' : 'تسجيل خروج'}</div>
                            <div className="text-[10px] font-semibold text-primary mt-0.5">الموظف: {l.actorName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {hoursWorked !== null && (
                            <div className="ml-4 text-left">
                              <div className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                                {hoursWorked.toFixed(2)} / {targetHours} hrs
                              </div>
                              <div className="text-[10px] text-muted-foreground">{isCompleted ? 'وردية مكتملة' : 'وردية غير مكتملة'}</div>
                            </div>
                          )}
                          <div className="text-left">
                              <div className="text-sm font-bold text-foreground"></div>
                              <div className="text-[10px] text-muted-foreground">{new Date(l.ts).toLocaleString('ar-EG')}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {logCategories.auth.length === 0 && <li className="p-12 text-center text-muted-foreground italic">لا توجد سجلات حضور/انصراف مطابقة.</li>}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closing" className="mt-4">
            <LogList items={logCategories.closing} type="logs" icon={<Lock className="w-4 h-4" />} />
          </TabsContent>
          <TabsContent value="system" className="mt-4">
            <LogList items={logCategories.system} type="logs" icon={<History className="w-4 h-4" />} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div id="reprint-area" className="p-4 bg-white text-black font-mono text-xs text-right" dir="rtl">
            <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="font-bold text-lg uppercase">صيدلية كير بلس</h2>
              <p className="mt-1 font-bold">** نسخة مطبوعة بديلة **</p>
              <p className="mt-1 text-gray-500">رقم: #{selectedSale?.id.replace('sale_', '')}</p>
              <p className="text-gray-500">{selectedSale?.ts && new Date(selectedSale.ts).toLocaleString('ar-EG')}</p>
            </div>
            
            <div className="space-y-3 mb-4">
              {selectedSale?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center flex-row-reverse border-b border-dashed border-gray-200 pb-2 last:border-0">
                  <div className="text-right">
                    <div className="font-bold text-sm">{item.qty}x {item.medicineName}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{formatMoney(item.unitPrice)} للوحدة</div>
                  </div>
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <span className="font-semibold">{formatMoney(item.qty * item.unitPrice)}</span>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] print:hidden gap-1 flex-row-reverse"
                      onClick={() => handleReturnItem(item.medicineId, item.medicineName)}
                    >
                      إرجاع <Undo2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-4 font-bold flex justify-between flex-row-reverse">
              <span>الإجمالي</span>
              <span>{selectedSale && formatMoney(selectedSale.total)}</span>
            </div>
            <div className="mt-4 text-center text-[10px] text-gray-500">الكاشير: {selectedSale?.cashierName}</div>
          </div>
          <DialogFooter className="print:hidden flex-row-reverse justify-between mt-4">
             {selectedSale && (
               <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleReturnFullSale}>
                 إرجاع كل الفاتورة
               </Button>
            )}
            <Button onClick={() => window.print()} className="gap-2 flex-row-reverse"><Printer className="w-4 h-4" /> طباعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function LogList({ items, type, onPrint, icon }: any) {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item: any) => (
            <li key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors flex-row-reverse">
              <div className="flex items-center gap-4 flex-row-reverse">
                <div className="p-2 bg-muted rounded-full text-primary">{icon || <ReceiptText className="w-4 h-4"/>}</div>
                <div className="text-right">
                  <div className="text-sm font-bold uppercase">
                    {type === 'sales' ? `فاتورة #${item.id.replace('sale_', '')}` : type === 'returns' ? `مرتجع لفاتورة #${item.saleId.replace('sale_', '')}` : item.action.replace('auth.', 'موظف: ').replace('payments.', 'ماليات: ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {type === 'sales' || type === 'returns' ? `الكاشير: ${item.cashierName}` : item.details}
                  </div>
                  {type !== 'sales' && type !== 'returns' && (
                    <div className="text-[10px] font-semibold text-primary mt-1">
                      بواسطة: {item.actorName}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                    <div className={`text-sm font-bold ${type === 'returns' ? 'text-destructive' : 'text-foreground'}`} dir="ltr">
                      {type === 'sales' ? formatMoney(item.total) : type === 'returns' ? formatMoney(item.totalRefund) : ''}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(item.ts).toLocaleString('ar-EG')}</div>
                </div>
                {type === 'sales' && (
                  <Button variant="outline" size="icon" onClick={() => onPrint(item)} className="h-8 w-8 ml-2"><Printer className="w-4 h-4" /></Button>
                )}
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="p-12 text-center text-muted-foreground italic">لا توجد سجلات لعرضها في هذا القسم.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}