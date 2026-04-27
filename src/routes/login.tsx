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

const MAX_DISTANCE_KM = 2.0; // مسموح بقطر 2 كيلومتر فقط للموظفين

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
  const users = useStore((s) => s.users); // سحبنا بيانات المستخدمين للتحقق من الصلاحيات قبل الدخول
  
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
    
    // 1. البحث عن المستخدم لمعرفة صلاحياته قبل أي إجراء
    const targetUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    if (!targetUser) {
      // بنحاول نعمل لوج إن عشان السيستم يطلّعله "بيانات الدخول غير صحيحة" في الـ executeLogin
      executeLogin(); 
      return;
    }

    // 2. لو المستخدم "مدير" (Admin)، يدخل فوراً من غير ما يسأله عن اللوكيشن
    if (targetUser.role === "admin") {
      executeLogin();
      return;
    }

    // 3. لو المستخدم "موظف" (Employee)، نتأكد إن المدير حددله لوكيشن الأول
    if (!targetUser.allowedLat || !targetUser.allowedLng) {
      setError("عذراً، لم يقم المدير بتحديد موقع العمل (Location) الخاص بك بعد. تواصل مع الإدارة.");
      return;
    }

    // 4. لو الموظف ليه لوكيشن متحدد، نسحب اللوكيشن الحالي بتاعه ونقارن
    if ("geolocation" in navigator) {
      setCheckingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const dist = calculateDistance(position.coords.latitude, position.coords.longitude, targetUser.allowedLat!, targetUser.allowedLng!);
          setCheckingLocation(false);
          
          if (dist > MAX_DISTANCE_KM) {
             setError("غير مسموح بتسجيل الدخول. أنت خارج النطاق الجغرافي المحدد لعملك."); 
             return;
          }
          
          // اللوكيشن صح، نعمله تسجيل دخول
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
          <p className="text-sm text-muted-foreground">نظام الإدارة — مؤمن جغرافياً</p>
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
              <ShieldCheck className="h-3.5 w-3.5" /> تعليمات الدخول
            </div>
            <ul className="list-disc pr-4 space-y-1 text-right mt-2">
              <li><strong>الإدارة (Admin):</strong> يمكنها الدخول من أي مكان بدون قيود جغرافية.</li>
              <li><strong>الموظفين (Employee):</strong> يتم التحقق من موقعهم ومطابقته بالموقع المسجل لهم من قبل الإدارة.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}