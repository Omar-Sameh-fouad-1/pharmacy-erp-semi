import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { computeAlerts, useStore } from "@/lib/store";
import { CURRENCY, formatMoney, LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS } from "@/lib/constants";
import { TrendingUp, Package, AlertTriangle, ShoppingCart, ScanBarcode, Pill, CalendarClock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const sales = useStore((s) => s.sales);
  const medicines = useStore((s) => s.medicines);
  const closings = useStore((s) => s.dailyClosings);

  const today = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter((s) => s.ts.slice(0, 10) === today);
  const todayTotal = todaysSales.reduce((a, b) => a + b.total, 0);
  const todayProfit = todaysSales.reduce((a, b) => a + b.profit, 0);

  const alerts = useMemo(() => {
    void medicines;
    return computeAlerts();
  }, [medicines]);
  const lowStock = alerts.filter((a) => a.type === "low_stock");
  const nearExpiry = alerts.filter((a) => a.type === "near_expiry");

  const chartData = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTotal =
        sales.filter((s) => s.ts.slice(0, 10) === key).reduce((a, b) => a + b.total, 0) +
        closings.filter((c) => c.date === key).reduce((a, b) => a + b.grandTotal, 0);
      days.push({ date: d.toLocaleDateString('ar-EG', { weekday: "short" }), total: dayTotal });
    }
    return days;
  }, [sales, closings]);

  const totalStockValue = medicines.reduce((a, m) => a + m.quantity * m.purchasePrice, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground">نظرة عامة على المبيعات، المخزون، والتنبيهات</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/pos">
                <ScanBarcode className="ml-2 h-4 w-4" /> فتح الكاشير
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/inventory">
                <Pill className="ml-2 h-4 w-4" /> إدارة المخزن
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="مبيعات اليوم" value={formatMoney(todayTotal)} sub={`${todaysSales.length} عملية بيع`} icon={<ShoppingCart className="h-5 w-5" />} accent />
          <StatCard label="أرباح اليوم" value={formatMoney(todayProfit)} sub="إجمالي الربح اليوم" icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="قيمة المخزون" value={formatMoney(totalStockValue)} sub={`${medicines.length} صنف مسجل`} icon={<Package className="h-5 w-5" />} />
          <StatCard label="التنبيهات النشطة" value={String(alerts.length)} sub={`${alerts.filter((a) => a.urgent).length} تنبيهات حرجة`} icon={<AlertTriangle className="h-5 w-5" />} danger={alerts.length > 0} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">المبيعات — آخر 7 أيام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64" dir="ltr"> {/* الرسم البياني بيفضل LTR عشان يترسم صح */}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} orientation="right" />
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", textAlign: "right" }}
                      formatter={(v: number) => [`${v.toFixed(2)} ${CURRENCY}`, "المبيعات"]}
                    />
                    <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-warning" /> تنبيهات هامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد تنبيهات. الأمور تمام ✨</p>}
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className={`rounded-lg border p-3 text-sm ${a.urgent ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{a.title}</div>
                    {a.urgent && <Badge variant="destructive">عاجل</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
                </div>
              ))}
              {alerts.length > 5 && (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/notifications">عرض كل التنبيهات ({alerts.length})</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> النواقص (أقل من {LOW_STOCK_THRESHOLD} علب)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد نواقص حالياً.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {lowStock.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{a.title.replace("Low stock: ", "")}</span>
                      <span className="text-muted-foreground">{a.message.replace("boxes left", "متبقي")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4" /> قرب انتهاء الصلاحية (أقل من {NEAR_EXPIRY_DAYS} يوم)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nearExpiry.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد أدوية تنتهي صلاحيتها قريباً.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {nearExpiry.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{a.title.replace(/^(Near expiry|EXPIRED): /, "")}</span>
                      <span className="text-muted-foreground">{a.message.replace("Expires in", "تنتهي خلال").replace("days", "أيام")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, sub, icon, accent, danger }: { label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean; danger?: boolean; }) {
  return (
    <Card className={accent ? "border-primary/40" : danger ? "border-destructive/40" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-primary/15 text-primary" : danger ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground"}`}>
            {icon}
          </span>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}