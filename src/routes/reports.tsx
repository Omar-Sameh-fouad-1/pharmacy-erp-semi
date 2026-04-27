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

  // Build dataset across closings + today
  const allHistorical: { date: string; total: number; profit: number; count: number }[] = useMemo(() => {
    const m = new Map<string, { date: string; total: number; profit: number; count: number }>();
    for (const c of closings) {
      m.set(c.date, { date: c.date, total: c.grandTotal, profit: 0, count: c.salesCount });
    }
    // approximate profit from sales
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
    void todayKey;
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
    const sum = filtered.reduce((a, b) => ({ total: a.total + b.total, profit: a.profit + b.profit, count: a.count + b.count }), { total: 0, profit: 0, count: 0 });
    return sum;
  }, [filtered]);

  const exportCSV = () => {
    const rows = [["date", "sales_count", "total", "profit"]];
    filtered.forEach((d) => rows.push([d.date, String(d.count), d.total.toFixed(2), d.profit.toFixed(2)]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportPDF = () => {
    // Simple printable view
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Report ${range}</title>
      <style>body{font-family:system-ui;padding:30px}h1{margin:0 0 10px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}</style>
      </head><body>
      <h1>CarePlus Pharmacy — ${range.toUpperCase()} Report</h1>
      <p>Generated ${new Date().toLocaleString()}</p>
      <p><strong>Total Sales:</strong> ${formatMoney(totals.total)} · <strong>Profit:</strong> ${formatMoney(totals.profit)} · <strong>Transactions:</strong> ${totals.count}</p>
      <table><thead><tr><th>Date</th><th>Sales</th><th>Profit</th><th># Tx</th></tr></thead>
      <tbody>${filtered.map((d) => `<tr><td>${d.date}</td><td>${d.total.toFixed(2)} ${CURRENCY}</td><td>${d.profit.toFixed(2)} ${CURRENCY}</td><td>${d.count}</td></tr>`).join("")}</tbody>
      </table>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    w.document.close();
  };

  const onCloseDay = () => {
    if (!security.setupComplete) {
      toast.error("Manager PIN not configured");
      return;
    }
    setPinOpen(true);
  };

  const submitClose = () => {
    const res = closeDay(pin);
    if (!res.ok) {
      toast.error(res.error || "Failed");
      return;
    }
    toast.success(`Day closed — ${formatMoney(res.closing!.grandTotal)}`);
    setPin("");
    setPinOpen(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Sales tracking, profit analysis, and end-of-day closing</p>
        </div>

        {/* Today live */}
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Today's Live Payments</span>
              <Badge variant="secondary">{todays.length} sales</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {(["cash", "card", "wallet", "insurance"] as const).map((m) => (
                <div key={m} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m}</div>
                  <div className="mt-1 text-lg font-bold">{formatMoney(todayTotals[m] || 0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Grand Total Today</div>
                <div className="text-3xl font-bold">{formatMoney(todayGrand)}</div>
              </div>
              <Button onClick={onCloseDay} disabled={todays.length === 0}>
                <Lock className="mr-2 h-4 w-4" /> End-of-Day Close (PIN required)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Range tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Historical Reports</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="mr-1 h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
              <TabsContent value={range} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Total Sales" value={formatMoney(totals.total)} />
                  <Stat label="Profit" value={formatMoney(totals.profit)} />
                  <Stat label="Transactions" value={String(totals.count)} />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filtered}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                      />
                      <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="profit" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Sales</th><th className="px-4 py-2">Profit</th><th className="px-4 py-2"># Tx</th></tr>
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
                      {filtered.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No data for this range</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" /> Manager PIN required
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Resetting daily payments is a critical action. Enter the manager PIN to proceed.
          </p>
          <div className="space-y-2">
            <Label>PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinOpen(false)}>Cancel</Button>
            <Button onClick={submitClose}>Confirm Close Day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}