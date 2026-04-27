import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill, LogIn, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { login, useStore } from "@/lib/store";
import { PHARMACY_NAME } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// إحداثيات الصيدلية (مثال: التجمع الخامس، القاهرة)
const PHARMACY_LAT = 30.0300; 
const PHARMACY_LNG = 31.4800;
const MAX_DISTANCE_KM = 2.0; // مسموح بقطر 2 كيلومتر فقط

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180; 
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function LoginPage() {
  const navigate = useNavigate();
  const currentUserId = useStore((s) => s.currentUserId);
  const security = useStore((s) => s.managerSecurity);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingLocation, setCheckingLocation] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      const isAdminWithoutPin = !security.setupComplete;
      if (isAdminWithoutPin) {
        navigate({ to: "/security-setup" });
      } else {
        navigate({ to: "/" });
      }
    }
  }, [currentUserId, security.setupComplete, navigate]);

  const executeLogin = () => {
    const res = login(username.trim(), password);
    if (!res.ok) {
      setError(res.error === "Invalid credentials" ? "بيانات الدخول غير صحيحة" : res.error);
      return;
    }
    toast.success(`أهلاً بك، ${res.user.fullName}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if ("geolocation" in navigator) {
      setCheckingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const dist = calculateDistance(position.coords.latitude, position.coords.longitude, PHARMACY_LAT, PHARMACY_LNG);
          setCheckingLocation(false);
          
          // مدير النظام يمكنه الدخول من أي مكان لحالات الطوارئ
          if (dist > MAX_DISTANCE_KM && username.toLowerCase() !== "admin") {
             setError("غير مسموح بتسجيل الدخول للموظفين من خارج نطاق الصيدلية."); 
             return;
          }
          executeLogin();
        },
        () => {
          setCheckingLocation(false);
          setError("يرجى تفعيل وإعطاء صلاحيات الموقع (Location) لتسجيل الدخول.");
        }
      );
    } else {
      // للمتصفحات القديمة
      executeLogin(); 
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-4 text-right rtl"
      dir="rtl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 10%, oklch(0.62 0.22 277 / 0.18), transparent 40%), radial-gradient(circle at 80% 90%, oklch(0.72 0.2 290 / 0.15), transparent 40%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{PHARMACY_NAME}</h1>
          <p className="text-sm text-muted-foreground">نظام الإدارة — تسجيل دخول الموظفين (مؤمن جغرافياً)</p>
        </div>

        <Card className="border-border/60 p-6 backdrop-blur">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                dir="ltr"
                className="text-right"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                className="text-right"
                required
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={checkingLocation}>
              {checkingLocation ? "جاري التحقق من موقعك..." : <><LogIn className="ml-2 h-4 w-4" /> تسجيل الدخول</>}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center justify-start gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> حسابات النظام
            </div>
            <div>
              <strong>المدير:</strong> admin / admin
            </div>
            <div>
              <strong>صيدلي:</strong> employee / emp
            </div>
            <div className="mt-2 flex items-center gap-1 font-semibold text-warning">
              <MapPin className="w-3 h-3"/> سيتم التحقق من إحداثيات تواجدك
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}