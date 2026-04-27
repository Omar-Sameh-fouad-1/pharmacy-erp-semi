import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteUser, upsertUser, useStore, uid, type User, type Role } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({ component: UsersPage });

const empty: User = {
  id: "", username: "", fullName: "", email: "", phone: "",
  role: "employee", password: "", active: true, createdAt: "", dailyHours: 8, 
};

function UsersPage() {
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const me = users.find((u) => u.id === currentUserId);
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<User | null>(null);

  useEffect(() => {
    if (me && me.role !== "admin") navigate({ to: "/" });
  }, [me, navigate]);

  const save = () => {
    if (!editing) return;
    if (!editing.username.trim() || !editing.fullName.trim()) return toast.error("الاسم واسم المستخدم مطلوبان");
    if (!editing.id && !editing.password) return toast.error("كلمة المرور مطلوبة للمستخدمين الجدد");
    const u: User = {
      ...editing,
      id: editing.id || uid("u_"),
      createdAt: editing.createdAt || new Date().toISOString(),
    };
    upsertUser(u);
    toast.success(`تم حفظ بيانات ${u.username}`);
    setOpen(false);
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="space-y-4 text-right" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-sm text-muted-foreground">للمديرين فقط · {users.length} مستخدمين</p>
          </div>
          <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }}>
            <Plus className="ml-2 h-4 w-4" /> إضافة مستخدم
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between p-4 flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    {u.role === "admin" ? <ShieldCheck className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{u.email} · @{u.username}</div>
                    <div className="mt-1 flex flex-row-reverse gap-1.5 justify-end">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "مدير" : "موظف"}
                      </Badge>
                      <Badge variant="outline" className="border-primary/30">{u.dailyHours} ساعات/يوم</Badge>
                      {!u.active && <Badge variant="destructive">معطل</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...u }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {u.id !== currentUserId && (
                    <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="text-right rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>الاسم بالكامل</Label>
                <Input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>اسم المستخدم (Username)</Label>
                <Input dir="ltr" className="text-right" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" dir="ltr" className="text-right" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" className="text-right" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الصلاحية</Label>
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as Role })}>
                  <SelectTrigger dir="rtl"><SelectValue placeholder="اختر الصلاحية" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="admin">مدير (Admin)</SelectItem>
                    <SelectItem value="employee">موظف (Employee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ساعات العمل اليومية</Label>
                <Input type="number" min="1" max="24" value={editing.dailyHours} onChange={(e) => setEditing({ ...editing, dailyHours: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{editing.id ? "إعادة تعيين كلمة المرور (اختياري)" : "كلمة المرور"}</Label>
                <Input type="text" dir="ltr" className="text-right" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                <div>
                  <Label>تفعيل الحساب</Label>
                  <p className="text-xs text-muted-foreground">المستخدمون المعطلون لا يمكنهم تسجيل الدخول للسيستم</p>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={save}>حفظ البيانات</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent className="text-right rtl">
          <DialogHeader>
            <DialogTitle>حذف {confirmDel?.fullName}؟</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">لن يتمكن هذا المستخدم من تسجيل الدخول بعد الآن.</p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={() => { if (confirmDel) { deleteUser(confirmDel.id); toast.success("تم حذف المستخدم"); setConfirmDel(null); } }}>حذف</Button>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}