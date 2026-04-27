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
    if (!/^\d{4,6}$/.test(pin)) return setErr("PIN must be 4-6 digits");
    if (pin !== pin2) return setErr("PINs do not match");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Invalid recovery email");
    if (!/^\+?[0-9]{8,15}$/.test(phone)) return setErr("Invalid recovery phone");
    setupManagerPin({ pin, recoveryEmail: email, recoveryPhone: phone });
    toast.success("Manager security configured");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Set up Manager Security
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This is your first sign-in. Configure a secure PIN and recovery details. The PIN
            protects critical actions like resetting daily payments.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pin">Manager PIN (4-6 digits)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin2">Confirm PIN</Label>
                <Input
                  id="pin2"
                  type="password"
                  inputMode="numeric"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Recovery email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Recovery phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20100..."
                required
              />
            </div>
            {err && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" className="w-full">
              Save and continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}