import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ReceiptText, History, CalendarDays, Printer, Lock, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore, type Sale, type AuditLog } from "@/lib/store";
import { formatMoney } from "@/lib/constants";

export const Route = createFileRoute("/audit")({ component: AuditPage });

function AuditPage() {
  const navigate = useNavigate();
  const logs = useStore((s) => s.auditLogs);
  const sales = useStore((s) => s.sales);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const me = users.find((u) => u.id === currentUserId);
  
  const [q, setQ] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (me && me.role !== "admin") navigate({ to: "/" });
  }, [me, navigate]);

  // ← الدالة اللي بتحسب الفرق بين وقت تسجيل الدخول ووقت تسجيل الخروج
  const calculateShift = (logoutLog: AuditLog) => {
    if (!logoutLog.action.includes("logout")) return null;
    
    const loginLog = logs.find(l => 
      l.actorId === logoutLog.actorId && 
      l.action.includes("login") && 
      new Date(l.ts) < new Date(logoutLog.ts)
    );

    if (!loginLog) return null;

    const durationMs = new Date(logoutLog.ts).getTime() - new Date(loginLog.ts).getTime();
    return durationMs / (1000 * 60 * 60); // تحويل الملي ثانية لساعات
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

  return (
    <AppShell>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reprint-area, #reprint-area * { visibility: visible; }
          #reprint-area { position: absolute; left: 0; top: 0; width: 100%; color: black; background: white; padding: 20px;}
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary">
              <ShieldAlert className="h-6 w-6" /> Management Hub
            </h1>
            <p className="text-sm text-muted-foreground">Detailed tracking of employee activities and sales</p>
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by employee or action…" className="max-w-sm" />
        </div>

        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="flex w-full overflow-x-auto justify-start border-b rounded-none bg-transparent h-auto p-0 gap-6">
            <TabsTrigger value="sales" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">Daily Sales</TabsTrigger>
            <TabsTrigger value="auth" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">Staff Attendance</TabsTrigger>
            <TabsTrigger value="closing" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">End of Day</TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none bg-transparent px-2 pb-2 h-full">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-4 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Invoices Today</p>
                        <p className="text-3xl font-bold">{filteredSales.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-success/20 bg-success/5">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-3xl font-bold">{formatMoney(totalRevenue)}</p>
                    </CardContent>
                </Card>
            </div>
            <LogList items={filteredSales} type="sales" onPrint={setSelectedSale} />
          </TabsContent>

          {/* ← تبويب الحضور والغياب (المعدل لحساب الساعات والتلوين) */}
          <TabsContent value="auth" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {logCategories.auth.map((l) => {
                    const hoursWorked = calculateShift(l);
                    const user = users.find(u => u.id === l.actorId);
                    const targetHours = user?.dailyHours || 8; // بيجيب الـ 8 ساعات أو اللي إنت حددتها
                    const isCompleted = hoursWorked !== null && hoursWorked >= targetHours;

                    return (
                      <li key={l.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${l.action.includes('login') ? 'bg-green-600/10 text-green-600' : 'bg-red-600/10 text-red-600'}`}>
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold uppercase">{l.action === 'auth.login' ? 'Signed In' : 'Signed Out'}</div>
                            <div className="text-[10px] font-semibold text-primary mt-0.5">Executed by: {l.actorName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          {/* بيظهر الساعات بالألوان بس لو كان بيعمل Logout */}
                          {hoursWorked !== null && (
                            <div className="mr-4">
                              <div className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-red-600'}`}>
                                {hoursWorked.toFixed(2)} hrs / {targetHours} hrs
                              </div>
                              <div className="text-[10px] text-muted-foreground">{isCompleted ? 'Full Shift Completed' : 'Incomplete Shift'}</div>
                            </div>
                          )}
                          <div>
                              <div className="text-sm font-bold text-foreground"></div>
                              <div className="text-[10px] text-muted-foreground">{new Date(l.ts).toLocaleString()}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {logCategories.auth.length === 0 && <li className="p-12 text-center text-muted-foreground italic">No entries found for this category.</li>}
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
        <DialogContent className="sm:max-w-md">
          <div id="reprint-area" className="p-4 bg-white text-black font-mono text-xs">
            <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="font-bold text-lg uppercase">CarePlus Pharmacy</h2>
              <p className="mt-1 italic">** REPRINT **</p>
              <p className="mt-1">ID: #{selectedSale?.id.replace('sale_', '')}</p>
              <p>{selectedSale?.ts && new Date(selectedSale.ts).toLocaleString()}</p>
            </div>
            <div className="space-y-1 mb-4">
              {selectedSale?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.qty}x {item.medicineName}</span>
                  <span>{formatMoney(item.qty * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-300 pt-4 font-bold flex justify-between">
              <span>TOTAL</span>
              <span>{selectedSale && formatMoney(selectedSale.total)}</span>
            </div>
            <div className="mt-4 text-center text-[10px]">Cashier: {selectedSale?.cashierName}</div>
          </div>
          <DialogFooter className="print:hidden">
            <Button onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Print</Button>
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
            <li key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-full text-primary">{icon || <ReceiptText className="w-4 h-4"/>}</div>
                <div>
                  <div className="text-sm font-bold uppercase">
                    {type === 'sales' ? `Invoice #${item.id.replace('sale_', '')}` : item.action.replace('auth.', 'Staff: ').replace('payments.', 'Finance: ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {type === 'sales' ? `Sold by: ${item.cashierName}` : item.details}
                  </div>
                  {type !== 'sales' && (
                    <div className="text-[10px] font-semibold text-primary mt-0.5">
                      Executed by: {item.actorName}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                    <div className="text-sm font-bold text-foreground">{type === 'sales' ? formatMoney(item.total) : ''}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(item.ts).toLocaleString()}</div>
                </div>
                {type === 'sales' && (
                  <Button variant="outline" size="icon" onClick={() => onPrint(item)} className="h-8 w-8"><Printer className="w-4 h-4" /></Button>
                )}
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="p-12 text-center text-muted-foreground italic">No entries found for this category.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}