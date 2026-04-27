import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Bell, Package, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeAlerts, useStore } from "@/lib/store";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const medicines = useStore((s) => s.medicines);
  const alerts = useMemo(() => { void medicines; return computeAlerts(); }, [medicines]);
  const urgent = alerts.filter((a) => a.urgent);
  const others = alerts.filter((a) => !a.urgent);

  return (
    <AppShell>
      <div className="space-y-6 text-right" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الإشعارات والتنبيهات</h1>
          <p className="text-sm text-muted-foreground">{alerts.length} تنبيه نشط</p>
        </div>

        {urgent.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wider text-destructive">
              <AlertTriangle className="h-4 w-4" /> عاجل ({urgent.length})
            </h2>
            <div className="grid gap-2">
              {urgent.map((a) => (
                <Card key={a.id} className="border-destructive/50 bg-destructive/5">
                  <CardContent className="flex items-start gap-3 p-4">
                    {a.type === "low_stock" ? <Package className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /> : <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold truncate" dir="rtl">{a.title}</div>
                        <Badge variant="destructive" className="shrink-0">عاجل</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wider text-warning">
              <Bell className="h-4 w-4" /> تنبيهات أخرى ({others.length})
            </h2>
            <div className="grid gap-2">
              {others.map((a) => (
                <Card key={a.id} className="border-warning/40">
                  <CardContent className="flex items-start gap-3 p-4">
                    {a.type === "low_stock" ? <Package className="mt-0.5 h-5 w-5 shrink-0 text-warning" /> : <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" dir="rtl">{a.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {alerts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground flex flex-col items-center">
            <Bell className="mb-3 h-10 w-10 opacity-40" />
            <p>الأمور ممتازة — لا يوجد أي إشعارات أو تنبيهات.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}