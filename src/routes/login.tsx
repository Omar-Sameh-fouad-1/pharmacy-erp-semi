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

const MAX_DISTANCE_KM = 2.0; 

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
  const users = useStore((s) => s.users);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingLocation, setCheckingLocation] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      if (!security.setupComplete) navigate({ to: "/security-setup" });
      else navigate({ to: "/" });
    }
  }, [currentUserId, security.setupComplete, navigate]);

  const executeLogin = () => {
    const res = login(username.trim(), password);
    if (!res.ok) {
      setError(res.error); // هيطلع "بيانات الدخول غير صحيحة"
      return;
    }
    toast.success(`أهلاً بك، ${res.user.fullName}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // 1. فحص هل اسم المستخدم موجود أصلاً في النظام؟
    const targetUser = users?.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    // 2. لو مش موجود، ابعت البيانات للـ store عشان هو اللي يطلع رسالة الخطأ الرسمية (أمان أكتر)
    if (!targetUser) {
      executeLogin();
      return;
    }

    // 3. لو موجود وهو "مدير"، دخله فوراً بالباسورد
    if (targetUser.role === "admin") {
      executeLogin();
      return;
    }

    // 4. لو "موظف" (Employee)، نتأكد إن المدير حددله لوكيشن الأول
    if (!targetUser.allowedLat || !targetUser.allowedLng) {
      setError("عذراً، لم يتم تحديد موقع العمل (Location) الخاص بك بعد. تواصل مع الإدارة.");
      return;
    }

    // 5. فحص الموقع الجغرافي للموظف فقط
    if ("geolocation" in navigator) {
      setCheckingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const dist = calculateDistance(
            position.coords.latitude, 
            position.coords.longitude, 
            targetUser.allowedLat!, 
            targetUser.allowedLng!
          );
          setCheckingLocation(false);
          
          if (dist > MAX_DISTANCE_KM) {
             setError("غير مسموح بالدخول: أنت خارج النطاق الجغرافي للصيدلية.");
             return;
          }
          executeLogin(); // الموقع صح، كمل الدخول
        },
        () => {
          setCheckingLocation(false);
          setError("يرجى تفعيل صلاحيات الموقع (Location) لتسجيل دخول الموظفين.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setError("متصفحك لا يدعم خاصية تحديد الموقع.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-right rtl" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{PHARMACY_NAME}</h1>
          <p className="text-sm text-muted-foreground">نظام الإدارة — تسجيل دخول آمن</p>
        </div>

        <Card className="border-border/60 p-6 backdrop-blur shadow-xl">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                dir="ltr"
                className="text-right"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="text-right"
                required
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={checkingLocation}>
              {checkingLocation ? "جاري فحص الموقع..." : <><LogIn className="ml-2 h-4 w-4" /> تسجيل الدخول</>}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center justify-start gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> سياسة الدخول
            </div>
            <ul className="list-disc pr-4 space-y-1">
              <li>المدير: دخول مباشر من أي مكان.</li>
              <li>الموظف: الدخول مرتبط بموقع الصيدلية المسجل.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}