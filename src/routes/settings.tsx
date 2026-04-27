import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, Moon, Sun, ShieldAlert, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { exportBackup, importBackup, resetDemoData, resetPinWithOld, resetPinWithOtp, setTheme, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const theme = useStore((s) => s.theme);
  const security = useStore((s) => s.managerSecurity);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<"old" | "otp">("old");
  const [oldPin, setOldPin] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");

  const downloadBackup = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `careplus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تحميل النسخة الاحتياطية");
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importBackup(String(reader.result));
      if (res.ok) toast.success("تم استعادة النسخة الاحتياطية");
      else toast.error(res.error || "حدث خطأ أثناء الاستعادة");
    };
    reader.readAsText(file);
  };

  const submitPinReset = () => {
    if (newPin !== newPin2) return toast.error("الرمز غير متطابق");
    if (!/^\d{4,6}$/.test(newPin)) return toast.error("يجب أن يكون الرمز بين 4 إلى 6 أرقام");
    const ok = resetMode === "old" ? resetPinWithOld(oldPin, newPin) : resetPinWithOtp(otp, newPin);
    if (!ok) return toast.error(resetMode === "old" ? "الرمز القديم غير صحيح" : "رمز الـ OTP غير صحيح");
    toast.success("تم تحديث الرمز بنجاح");
    setResetOpen(false);
    setOldPin(""); setOtp(""); setNewPin(""); setNewPin2("");
  };

  return (
    <AppShell>
      <div className="space-y-6 text-right">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
          <p className="text-sm text-muted-foreground">تفضيلات النظام، النسخ الاحتياطي، والأمان</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">المظهر</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>السمة (Theme)</Label>
                <p className="text-xs text-muted-foreground">التبديل بين الوضع الليلي والنهاري</p>
              </div>
              <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <><Sun className="ml-2 h-4 w-4" /> الوضع النهاري</> : <><Moon className="ml-2 h-4 w-4" /> الوضع الليلي</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> أمان المدير</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">تم تعيين الرمز (PIN)</span><span className="font-medium">{security.setupComplete ? "نعم" : "لا"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">إيميل الاسترداد</span><span className="font-medium">{security.recoveryEmail || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">رقم الهاتف</span><span className="font-medium">{security.recoveryPhone || "—"}</span></div>
            </div>
            <Button variant="outline" disabled={!security.setupComplete} onClick={() => setResetOpen(true)}>إعادة تعيين الرمز</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">النسخ الاحتياطي والاستعادة</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadBackup}><Download className="ml-2 h-4 w-4" /> تحميل نسخة (JSON)</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="ml-2 h-4 w-4" /> استعادة من ملف</Button>
            <Button variant="destructive" onClick={() => { if (confirm("هل أنت متأكد من مسح جميع البيانات والعودة للوضع الافتراضي؟")) { resetDemoData(); toast.success("تم إعادة ضبط النظام"); } }}>
              <RefreshCw className="ml-2 h-4 w-4" /> إعادة ضبط النظام (حذف الكل)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="text-right rtl">
          <DialogHeader><DialogTitle>إعادة تعيين رمز المدير</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Button variant={resetMode === "old" ? "default" : "outline"} size="sm" onClick={() => setResetMode("old")}>بالرمز القديم</Button>
            <Button variant={resetMode === "otp" ? "default" : "outline"} size="sm" onClick={() => setResetMode("otp")}>بكود (OTP)</Button>
          </div>
          {resetMode === "old" ? (
            <div className="space-y-2">
              <Label>الرمز القديم</Label>
              <Input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} dir="ltr" className="text-right" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>رمز التأكيد OTP (6 أرقام)</Label>
              <Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} dir="ltr" className="text-right" />
              <p className="text-xs text-muted-foreground">نسخة تجريبية: أدخل أي 6 أرقام للمرور. في النظام الحقيقي سيرسل الكود إلى {security.recoveryEmail}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2"><Label>تأكيد الرمز</Label><Input type="password" inputMode="numeric" maxLength={6} value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} dir="ltr" className="text-right" /></div>
            <div className="space-y-2"><Label>الرمز الجديد</Label><Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} dir="ltr" className="text-right" /></div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={submitPinReset}>حفظ التغييرات</Button>
            <Button variant="outline" onClick={() => setResetOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}