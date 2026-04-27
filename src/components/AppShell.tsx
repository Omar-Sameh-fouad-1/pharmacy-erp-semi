import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ScanBarcode,
  Pill,
  Truck,
  Search,
  BarChart3,
  Users as UsersIcon,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  ShieldAlert,
  Menu,
  X,
  ReceiptText, // ← أيقونة المبيعات الجديدة
} from "lucide-react";
import { computeAlerts, getCurrentUser, logout, setTheme, useStore } from "@/lib/store";
import { PHARMACY_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const theme = useStore((s) => s.theme);
  const medicines = useStore((s) => s.medicines);
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useMemo(() => users.find((u) => u.id === currentUserId) || null, [users, currentUserId]);

  useEffect(() => {
    // Redirect unauthenticated users to /login
    if (!currentUserId && location.pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [currentUserId, location.pathname, navigate]);

  // Recompute alerts whenever medicines change
  const alerts = useMemo(() => {
    void medicines;
    return computeAlerts();
  }, [medicines]);

  const urgentCount = alerts.filter((a) => a.urgent).length;

  const nav: NavItem[] = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pos", label: "POS / Sell", icon: ScanBarcode },
    { to: "/inventory", label: "Inventory", icon: Pill },
    { to: "/suppliers", label: "Suppliers", icon: Truck },
    { to: "/search", label: "Search", icon: Search },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/notifications", label: "Notifications", icon: Bell, badge: urgentCount || undefined },
    { to: "/users", label: "Users", icon: UsersIcon, adminOnly: true },
    { to: "/audit", label: "Management Hub", icon: ShieldAlert, adminOnly: true }, // ← تغيير الاسم هنا
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar print:hidden"> {/* ← ضفنا print:hidden */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Pill className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-foreground">CarePlus</div>
          <div className="text-xs text-muted-foreground">Pharmacy ERP</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {nav
            .filter((n) => !n.adminOnly || user.role === "admin")
            .map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-sidebar-accent/40 p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-sidebar-foreground">{user.fullName}</div>
            <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{user.role}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block print:hidden">{Sidebar}</div> {/* ← ضفنا print:hidden */}

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden"> {/* ← ضفنا print:hidden */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6 print:hidden"> {/* ← ضفنا print:hidden */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{PHARMACY_NAME}</div>
              <div className="text-sm font-semibold">
                {nav.find((n) => n.to === location.pathname)?.label || "Dashboard"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {urgentCount > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6 print:p-0 print:m-0">{children}</main> {/* ← ضفنا print:p-0 print:m-0 */}
      </div>
    </div>
  );
}

export function getCurrentUserSafe() {
  return getCurrentUser();
}