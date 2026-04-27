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
    toast.success("Backup downloaded");
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importBackup(String(reader.result));
      if (res.ok) toast.success("Backup restored");
      else toast.error(res.error || "Failed");
    };
    reader.readAsText(file);
  };

  const submitPinReset = () => {
    if (newPin !== newPin2) return toast.error("PINs do not match");
    if (!/^\d{4,6}$/.test(newPin)) return toast.error("PIN must be 4-6 digits");
    const ok = resetMode === "old" ? resetPinWithOld(oldPin, newPin) : resetPinWithOtp(otp, newPin);
    if (!ok) return toast.error(resetMode === "old" ? "Invalid old PIN" : "Invalid OTP (use any 6 digits in this demo)");
    toast.success("PIN updated");
    setResetOpen(false);
    setOldPin(""); setOtp(""); setNewPin(""); setNewPin2("");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">System preferences, backup, and security</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
              </div>
              <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <><Sun className="mr-2 h-4 w-4" /> Light mode</> : <><Moon className="mr-2 h-4 w-4" /> Dark mode</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Manager Security</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">PIN configured</span><span className="font-medium">{security.setupComplete ? "Yes" : "No"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recovery email</span><span className="font-medium">{security.recoveryEmail || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recovery phone</span><span className="font-medium">{security.recoveryPhone || "—"}</span></div>
            </div>
            <Button variant="outline" disabled={!security.setupComplete} onClick={() => setResetOpen(true)}>Reset PIN</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Backup & Restore</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadBackup}><Download className="mr-2 h-4 w-4" /> Download backup (JSON)</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Restore from file</Button>
            <Button variant="destructive" onClick={() => { if (confirm("Reset all demo data?")) { resetDemoData(); toast.success("Reset"); } }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reset demo data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Manager PIN</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Button variant={resetMode === "old" ? "default" : "outline"} size="sm" onClick={() => setResetMode("old")}>With old PIN</Button>
            <Button variant={resetMode === "otp" ? "default" : "outline"} size="sm" onClick={() => setResetMode("otp")}>With OTP</Button>
          </div>
          {resetMode === "old" ? (
            <div className="space-y-2">
              <Label>Old PIN</Label>
              <Input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>OTP (6 digits)</Label>
              <Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
              <p className="text-xs text-muted-foreground">Demo: any 6 digits will succeed. In production, OTP would be sent to {security.recoveryEmail} or {security.recoveryPhone}.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2"><Label>New PIN</Label><Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} /></div>
            <div className="space-y-2"><Label>Confirm</Label><Input type="password" inputMode="numeric" maxLength={6} value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={submitPinReset}>Reset PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}