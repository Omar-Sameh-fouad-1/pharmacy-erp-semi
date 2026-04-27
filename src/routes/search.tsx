import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, Pill } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { daysUntil, formatMoney, LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS } from "@/lib/constants";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const medicines = useStore((s) => s.medicines);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return medicines;
    return medicines.filter((m) => m.name.toLowerCase().includes(t) || m.barcode.includes(t));
  }, [medicines, q]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicine Search</h1>
          <p className="text-sm text-muted-foreground">Search across the entire catalog by name or barcode</p>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a medicine name or scan a barcode…"
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((m) => {
            const days = daysUntil(m.expiryDate);
            const low = m.quantity <= LOW_STOCK_THRESHOLD;
            const near = days <= NEAR_EXPIRY_DAYS && days >= 0;
            const expired = days < 0;
            return (
              <Card
                key={m.id}
                className={
                  expired
                    ? "border-destructive/50"
                    : low || near
                      ? "border-warning/50"
                      : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Pill className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{m.barcode}</div>
                      </div>
                    </div>
                    {m.requiresPrescription && (
                      <Badge variant="outline" className="border-warning/50 text-warning">Rx</Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Quantity</div>
                      <div className={low ? "font-semibold text-destructive" : "font-medium"}>
                        {m.quantity} boxes {low && <Badge variant="destructive" className="ml-1">Low</Badge>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Expiry</div>
                      <div className={expired ? "font-semibold text-destructive" : near ? "font-medium text-warning" : "font-medium"}>
                        {m.expiryDate}
                        <div className="text-xs">{expired ? `${Math.abs(days)}d ago` : `${days}d left`}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Selling</div>
                      <div className="font-medium">{formatMoney(m.sellingPrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Cost</div>
                      <div className="text-muted-foreground">{formatMoney(m.purchasePrice)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {results.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No medicines match your search
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}