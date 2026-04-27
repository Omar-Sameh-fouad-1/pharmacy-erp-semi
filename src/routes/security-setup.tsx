import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setupManagerPin, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/security-setup")({
  component: SecuritySetupPage,
});

function SecuritySetupPage() {
  const navigate = useNavigate();
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const security = useStore((s) => s.managerSecurity);
  const user = users.find((u) => u.id === currentUserId);

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!currentUserId) navigate({ to: "/login" });
    else if (security.setupComplete) navigate({ to: "/" });
  }, [currentUserId, security.setupComplete, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!/^\d{4,6}$/.test(pin)) return setErr("يجب أن يكون الرمز بين 4 إلى 6 أرقام");
    if (pin !== pin2) return setErr("الرمز السري غير متطابق");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("البريد الإلكتروني غير صالح");
    if (!/^\+?[0-9]{8,15}$/.test(phone)) return setErr("رقم الهاتف غير صالح");
    setupManagerPin({ pin, recoveryEmail: email, recoveryPhone: phone });
    toast.success("تم إعداد أمان المدير بنجاح");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-right" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> إعداد أمان المدير
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            هذا هو أول تسجيل دخول لك. قم بإعداد رمز PIN آمن وبيانات الاسترداد. هذا الرمز يحمي الإجراءات الهامة مثل تقفيل اليومية.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pin">رمز المدير (4-6 أرقام)</Label>
                <Input id="pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required dir="ltr" className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin2">تأكيد الرمز</Label>
                <Input id="pin2" type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} maxLength={6} required dir="ltr" className="text-right" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">بريد الاسترداد الإلكتروني</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" className="text-right" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم هاتف الاسترداد</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20100..." required dir="ltr" className="text-right" />
            </div>
            {err && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full">حفظ ومتابعة</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}