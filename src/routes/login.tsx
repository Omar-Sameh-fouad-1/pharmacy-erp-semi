import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill, LogIn, ShieldCheck } from "lucide-react";
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

function LoginPage() {
  const navigate = useNavigate();
  const currentUserId = useStore((s) => s.currentUserId);
  const security = useStore((s) => s.managerSecurity);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUserId) {
      if (!security.setupComplete) navigate({ to: "/security-setup" });
      else navigate({ to: "/" });
    }
  }, [currentUserId, security.setupComplete, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const res = login(username.trim(), password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(`أهلاً بك، ${res.user.fullName}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-right rtl" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{PHARMACY_NAME}</h1>
          <p className="text-sm text-muted-foreground">نظام الإدارة — تسجيل دخول الموظفين</p>
        </div>

        <Card className="border-border/60 p-6 backdrop-blur shadow-xl">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
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
            <Button type="submit" className="w-full" size="lg">
              <LogIn className="ml-2 h-4 w-4" /> تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="mb-1 flex items-center justify-start gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> تعليمات
            </div>
            <p>أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}