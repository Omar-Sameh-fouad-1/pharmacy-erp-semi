import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ShieldAlert, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { closeDay, getTodaysSales, useStore, type Sale } from "@/lib/store";
import { CURRENCY, formatMoney } from "@/lib/constants";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

type Range = "day" | "week" | "month";

const methodAr: Record<string, string> = { cash: "كاش", card: "فيزا", wallet: "محفظة", insurance: "تأمين" };

function ReportsPage() {
  const sales = useStore((s) => s.sales);
  const closings = useStore((s) => s.dailyClosings);
  const security = useStore((s) => s.managerSecurity);
  const [range, setRange] = useState<Range>("day");
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");

  const todays = getTodaysSales();
  const todayTotals = useMemo(() => {
    const t = { cash: 0, card: 0, wallet: 0, insurance: 0 } as Record<string, number>;
    todays.forEach((s) => { t[s.paymentMethod] += s.total; });
    return t;
  }, [todays]);
  const todayGrand = Object.values(todayTotals).reduce((a, b) => a + b, 0);

  const allHistorical = useMemo(() => {
    const m = new Map<string, { date: string; total: number; profit: number; count: number }>();
    for (const c of closings) {
      m.set(c.date, { date: c.date, total: c.grandTotal, profit: 0, count: c.salesCount });
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    const allSales: Sale[] = [...sales];
    for (const s of allSales) {
      const d = s.ts.slice(0, 10);
      const cur = m.get(d) || { date: d, total: 0, profit: 0, count: 0 };
      cur.total += s.total;
      cur.profit += s.profit;
      cur.count += 1;
      m.set(d, cur);
    }
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [closings, sales]);

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (range === "day") cutoff.setDate(now.getDate() - 1);
    if (range === "week") cutoff.setDate(now.getDate() - 7);
    if (range === "month") cutoff.setDate(now.getDate() - 30);
    return allHistorical.filter((d) => new Date(d.date).getTime() >= cutoff.getTime());
  }, [allHistorical, range]);

  const totals = useMemo(() => {
    return filtered.reduce((a, b) => ({ total: a.total + b.total, profit: a.profit + b.profit, count: a.count + b.count }), { total: 0, profit: 0, count: 0 });
  }, [filtered]);

  const exportCSV = () => {
    const rows = [["التاريخ", "عدد العمليات", "إجمالي المبيعات", "الأرباح"]];
    filtered.forEach((d) => rows.push([d.date, String(d.count), d.total.toFixed(2), d.profit.toFixed(2)]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" }); // إضافة BOM لدعم العربي في الإكسيل
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير ملف CSV");
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html dir="rtl" lang="ar"><head><title>تقرير ${range}</title>
      <style>body{font-family:system-ui;padding:30px;text-align:right}h1{margin:0 0 10px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#f0f0f0}</style>
      </head><body>
      <h1>صيدلية كير بلس — تقرير (${range === 'day' ? 'يومي' : range === 'week' ? 'أسبوعي' : 'شهري'})</h1>
      <p>تم الإنشاء في ${new Date().toLocaleString('ar-EG')}</p>
      <p><strong>إجمالي المبيعات:</strong> ${formatMoney(totals.total)} · <strong>الأرباح:</strong> ${formatMoney(totals.profit)} · <strong>عدد العمليات:</strong> ${totals.count}</p>
      <table><thead><tr><th>التاريخ</th><th>المبيعات</th><th>الربح</th><th>العمليات</th></tr></thead>
      <tbody>${filtered.map((d) => `<tr><td>${d.date}</td><td>${d.total.toFixed(2)} ${CURRENCY}</td><td>${d.profit.toFixed(2)} ${CURRENCY}</td><td>${d.count}</td></tr>`).join("")}</tbody>
      </table>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  const onCloseDay = () => {
    if (!security.setupComplete) {
      toast.error("لم يتم إعداد رمز المدير (PIN)");
      return;
    }
    setPinOpen(true);
  };

  const submitClose = () => {
    const res = closeDay(pin);
    if (!res.ok) {
      toast.error(res.error === "Invalid PIN" ? "الرمز غير صحيح" : "حدث خطأ");
      return;
    }
    toast.success(`تم تقفيل اليوم بنجاح — ${formatMoney(res.closing!.grandTotal)}`);
    setPin("");
    setPinOpen(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground">تتبع المبيعات، تحليل الأرباح، وتقفيل الوردية</p>
        </div>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>مبيعات اليوم الحالية</span>
              <Badge variant="secondary">{todays.length} عملية بيع</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {(["cash", "card", "wallet", "insurance"] as const).map((m) => (
                <div key={m} className="rounded-lg border border-border bg-muted/30 p-3 text-right">
                  <div className="text-xs tracking-wider text-muted-foreground">{methodAr[m]}</div>
                  <div className="mt-1 text-lg font-bold">{formatMoney(todayTotals[m] || 0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={onCloseDay} disabled={todays.length === 0}>
                تقفيل اليومية (مطلوب رمز) <Lock className="ml-2 h-4 w-4" />
              </Button>
              <div className="text-left sm:text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">إجمالي مبيعات اليوم</div>
                <div className="text-3xl font-bold">{formatMoney(todayGrand)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>التقارير السابقة</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}><Download className="ml-1 h-4 w-4" /> CSV</Button>
                <Button variant="outline" size="sm" onClick={exportPDF}><Download className="ml-1 h-4 w-4" /> PDF</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={range} onValueChange={(v) => setRange(v as Range)} dir="rtl">
              <TabsList>
                <TabsTrigger value="day">يومي</TabsTrigger>
                <TabsTrigger value="week">أسبوعي</TabsTrigger>
                <TabsTrigger value="month">شهري</TabsTrigger>
              </TabsList>
              <TabsContent value={range} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="إجمالي المبيعات" value={formatMoney(totals.total)} />
                  <Stat label="الأرباح" value={formatMoney(totals.profit)} />
                  <Stat label="عدد العمليات" value={String(totals.count)} />
                </div>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filtered}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} orientation="right" />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, textAlign: "right" }} formatter={(v: number) => [`${v.toFixed(2)} ${CURRENCY}`]} />
                      <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="profit" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-4 py-2">التاريخ</th><th className="px-4 py-2">المبيعات</th><th className="px-4 py-2">الربح</th><th className="px-4 py-2">عدد العمليات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((d) => (
                        <tr key={d.date}>
                          <td className="px-4 py-2">{d.date}</td>
                          <td className="px-4 py-2 font-medium">{formatMoney(d.total)}</td>
                          <td className="px-4 py-2 text-success">{formatMoney(d.profit)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{d.count}</td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">لا يوجد بيانات لهذه الفترة</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="text-right rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-warning" /> مطلوب رمز المدير</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">تقفيل اليومية هو إجراء هام يصفر مبيعات اليوم الحالية. أدخل رمز المدير (PIN) للمتابعة.</p>
          <div className="space-y-2">
            <Label>الرمز السري</Label>
            <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} autoFocus dir="ltr" className="text-right" />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={submitClose}>تأكيد التقفيل</Button>
            <Button variant="outline" onClick={() => setPinOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4 text-right">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}