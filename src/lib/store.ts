import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "admin" | "employee";

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  active: boolean;
  createdAt: string;
  dailyHours: number;
}

export interface Supplier {
  id: string;
  name: string;
  phones: string[];
  address: string;
}

export interface Medicine {
  id: string;
  name: string;
  barcode: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  requiresPrescription: boolean;
  supplierIds: string[]; 
  createdAt: string;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export type PaymentMethod = "cash" | "card" | "wallet" | "insurance";

export interface Sale {
  id: string;
  ts: string;
  items: SaleItem[];
  total: number;
  cost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashierId: string;
  cashierName: string;
}

export interface ReturnSale {
  id: string;
  saleId: string;
  ts: string;
  items: SaleItem[];
  totalRefund: number;
  cashierId: string;
  cashierName: string;
}

export interface DailyClosing {
  id: string;
  closedAt: string;
  date: string;
  totals: Record<PaymentMethod, number>;
  grandTotal: number;
  salesCount: number;
  closedById: string;
  closedByName: string;
}

export interface AuditLog {
  id: string;
  ts: string;
  actorId: string;
  actorName: string;
  action: string;
  details?: string;
  severity: "info" | "warn" | "critical";
}

export interface ManagerSecurity {
  pinHash: string | null;
  recoveryEmail: string;
  recoveryPhone: string;
  setupComplete: boolean;
}

export interface Notification {
  id: string;
  ts: string;
  type: "low_stock" | "near_expiry" | "info";
  title: string;
  message: string;
  read: boolean;
  urgent: boolean;
}

export interface AppState {
  users: User[];
  currentUserId: string | null;
  suppliers: Supplier[];
  medicines: Medicine[];
  sales: Sale[];
  returns: ReturnSale[];
  dailyClosings: DailyClosing[];
  auditLogs: AuditLog[];
  managerSecurity: ManagerSecurity;
  notifications: Notification[];
  theme: "dark" | "light";
}

const STORAGE_KEY = "careplus-erp-state-v1";

function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoFromDaysOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seed(): AppState {
  const adminId = uid("u_");
  const empId = uid("u_");
  const sup1 = uid("s_");
  const sup2 = uid("s_");
  const sup3 = uid("s_");
  const meds: Medicine[] = [
    { id: uid("m_"), name: "Paracetamol 500mg", barcode: "6221001000011", expiryDate: isoFromDaysOffset(420), quantity: 124, purchasePrice: 8, sellingPrice: 15, requiresPrescription: false, supplierIds: [sup1], createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Amoxicillin 500mg", barcode: "6221001000028", expiryDate: isoFromDaysOffset(180), quantity: 8, purchasePrice: 22, sellingPrice: 38, requiresPrescription: true, supplierIds: [sup2, sup3], createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Ibuprofen 400mg", barcode: "6221001000035", expiryDate: isoFromDaysOffset(20), quantity: 45, purchasePrice: 11, sellingPrice: 22, requiresPrescription: false, supplierIds: [sup1, sup2], createdAt: new Date().toISOString() },
  ];
  return {
    users: [
      { id: adminId, username: "admin", fullName: "المدير", email: "admin@pharmacy.com", phone: "+201000000000", role: "admin", password: "admin", active: true, createdAt: new Date().toISOString(), dailyHours: 8 },
      { id: empId, username: "employee", fullName: "صيدلي", email: "sara@pharmacy.com", phone: "+201111111111", role: "employee", password: "emp", active: true, createdAt: new Date().toISOString(), dailyHours: 8 },
    ],
    currentUserId: null,
    suppliers: [
      { id: sup1, name: "الشركة المصرية للأدوية", phones: ["+20223456789"], address: "مدينة نصر، القاهرة" },
      { id: sup2, name: "فارما أوفرسيز", phones: ["+20227778888"], address: "مصر الجديدة، القاهرة" },
      { id: sup3, name: "ابن سينا فارما", phones: ["+20233334444"], address: "الجيزة" },
    ],
    medicines: meds,
    sales: [],
    returns: [],
    dailyClosings: [],
    auditLogs: [
      { id: uid("a_"), ts: new Date().toISOString(), actorId: adminId, actorName: "المدير", action: "system.seed", details: "تمت تهيئة النظام", severity: "info" },
    ],
    managerSecurity: { pinHash: null, recoveryEmail: "admin@pharmacy.com", recoveryPhone: "+201000000000", setupComplete: false },
    notifications: [],
    theme: "dark",
  };
}

function loadInitial(): AppState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as AppState;
  } catch {
    return seed();
  }
}

let state: AppState = loadInitial();
const listeners = new Set<() => void>();

function notify() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  notify();
}

function getState(): AppState {
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const snapshot = useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
  void hydrated;
  return snapshot;
}

export function getCurrentUser(): User | null {
  const s = getState();
  return s.users.find((u) => u.id === s.currentUserId) || null;
}

function logAudit(action: string, details?: string, severity: AuditLog["severity"] = "info") {
  const cu = getCurrentUser();
  setState((s) => ({
    ...s,
    auditLogs: [{ id: uid("a_"), ts: new Date().toISOString(), actorId: cu?.id || "system", actorName: cu?.fullName || "النظام", action, details, severity }, ...s.auditLogs].slice(0, 500),
  }));
}

export function login(username: string, password: string): { ok: true; user: User } | { ok: false; error: string } {
  const s = getState();
  const user = s.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: "بيانات الدخول غير صحيحة" };
  if (!user.active) return { ok: false, error: "هذا الحساب معطل" };
  setState((s) => ({ ...s, currentUserId: user.id }));
  logAudit("auth.login", `تسجيل دخول للمستخدم ${user.username}`);
  return { ok: true, user };
}

export function logout() {
  logAudit("auth.logout", "تسجيل خروج");
  setState((s) => ({ ...s, currentUserId: null }));
}

export function setTheme(theme: "dark" | "light") { setState((s) => ({ ...s, theme })); }

export function setupManagerPin(input: { pin: string; recoveryEmail: string; recoveryPhone: string }) {
  setState((s) => ({ ...s, managerSecurity: { pinHash: input.pin, recoveryEmail: input.recoveryEmail, recoveryPhone: input.recoveryPhone, setupComplete: true } }));
  logAudit("security.pin_setup", "تم إعداد رمز المدير", "critical");
}

export function verifyPin(pin: string): boolean { return getState().managerSecurity.pinHash === pin; }

export function resetPinWithOld(oldPin: string, newPin: string): boolean {
  if (!verifyPin(oldPin)) return false;
  setState((s) => ({ ...s, managerSecurity: { ...s.managerSecurity, pinHash: newPin } }));
  logAudit("security.pin_reset_old", "تم إعادة تعيين الرمز باستخدام الرمز القديم", "critical");
  return true;
}

export function resetPinWithOtp(otp: string, newPin: string): boolean {
  if (!/^\d{6}$/.test(otp)) return false;
  setState((s) => ({ ...s, managerSecurity: { ...s.managerSecurity, pinHash: newPin } }));
  logAudit("security.pin_reset_otp", "تم إعادة تعيين الرمز بواسطة OTP", "critical");
  return true;
}

export function upsertSupplier(s: Supplier) {
  setState((st) => {
    const exists = st.suppliers.some((x) => x.id === s.id);
    return { ...st, suppliers: exists ? st.suppliers.map((x) => (x.id === s.id ? s : x)) : [...st.suppliers, s] };
  });
  logAudit("supplier.upsert", `مورد: ${s.name}`);
}

export function deleteSupplier(id: string) {
  setState((st) => ({
    ...st,
    suppliers: st.suppliers.filter((x) => x.id !== id),
    medicines: st.medicines.map((m) => ({ ...m, supplierIds: m.supplierIds.filter(sid => sid !== id) })),
  }));
  logAudit("supplier.delete", `تم حذف مورد`);
}

export function upsertMedicine(m: Medicine): { ok: boolean; error?: string } {
  const st = getState();
  const dup = st.medicines.find((x) => x.barcode === m.barcode && x.id !== m.id);
  if (dup) return { ok: false, error: "الباركود مستخدم بالفعل" };
  setState((st) => {
    const exists = st.medicines.some((x) => x.id === m.id);
    return { ...st, medicines: exists ? st.medicines.map((x) => (x.id === m.id ? m : x)) : [...st.medicines, m] };
  });
  logAudit("medicine.upsert", `دواء: ${m.name} (${m.barcode})`);
  return { ok: true };
}

export function deleteMedicine(id: string) {
  const m = getState().medicines.find((x) => x.id === id);
  setState((st) => ({ ...st, medicines: st.medicines.filter((x) => x.id !== id) }));
  logAudit("medicine.delete", m ? `تم حذف ${m.name}` : `حذف دواء`, "warn");
}

export function findMedicineByBarcode(barcode: string): Medicine | undefined {
  return getState().medicines.find((m) => m.barcode === barcode);
}

export function recordSale(input: { items: SaleItem[]; paymentMethod: PaymentMethod }): { ok: boolean; error?: string; sale?: Sale } {
  const cu = getCurrentUser();
  if (!cu) return { ok: false, error: "يجب تسجيل الدخول أولاً" };
  const st = getState();
  for (const it of input.items) {
    const med = st.medicines.find((m) => m.id === it.medicineId);
    if (!med) return { ok: false, error: `الدواء غير موجود: ${it.medicineName}` };
    if (med.quantity < it.qty) return { ok: false, error: `الكمية غير كافية لـ ${med.name}` };
  }
  const total = input.items.reduce((a, b) => a + b.qty * b.unitPrice, 0);
  const cost = input.items.reduce((a, b) => a + b.qty * b.unitCost, 0);
  const sale: Sale = { id: uid("sale_"), ts: new Date().toISOString(), items: input.items, total, cost, profit: total - cost, paymentMethod: input.paymentMethod, cashierId: cu.id, cashierName: cu.fullName };
  setState((st) => ({
    ...st,
    sales: [sale, ...st.sales],
    medicines: st.medicines.map((m) => { const it = input.items.find((i) => i.medicineId === m.id); return it ? { ...m, quantity: m.quantity - it.qty } : m; }),
  }));
  logAudit("sale.record", `عملية بيع بقيمة ${total.toFixed(2)}`);
  return { ok: true, sale };
}

// دالة إرجاع الفاتورة بالكامل
export function processReturn(saleId: string): { ok: boolean; error?: string } {
  const st = getState();
  const sale = st.sales.find(s => s.id === saleId);
  if (!sale) return { ok: false, error: "الفاتورة غير موجودة" };
  if (st.returns?.some(r => r.saleId === saleId && r.items.length === sale.items.length)) return { ok: false, error: "تم إرجاع الفاتورة مسبقاً" };

  const cu = getCurrentUser();
  const ret: ReturnSale = { id: uid("ret_"), saleId, ts: new Date().toISOString(), items: sale.items, totalRefund: sale.total, cashierId: cu?.id || "system", cashierName: cu?.fullName || "النظام" };
  
  setState(s => ({
    ...s,
    sales: s.sales.filter(x => x.id !== saleId),
    returns: [ret, ...(s.returns || [])],
    medicines: s.medicines.map(m => { const it = sale.items.find(i => i.medicineId === m.id); return it ? { ...m, quantity: m.quantity + it.qty } : m; })
  }));
  
  logAudit("sale.return", `إرجاع فاتورة #${saleId.slice(0,8)} بقيمة ${sale.total}`);
  return { ok: true };
}

// دالة إرجاع صنف محدد من الفاتورة (المرتجع الجزئي)
export function processItemReturn(saleId: string, medicineId: string): { ok: boolean; error?: string } {
  const st = getState();
  const sale = st.sales.find(s => s.id === saleId);
  if (!sale) return { ok: false, error: "الفاتورة غير موجودة" };

  const itemIndex = sale.items.findIndex(i => i.medicineId === medicineId);
  if (itemIndex === -1) return { ok: false, error: "هذا الصنف غير موجود بالفاتورة" };

  const item = sale.items[itemIndex];
  const itemTotal = item.qty * item.unitPrice;
  const itemCost = item.qty * item.unitCost;

  const cu = getCurrentUser();
  const ret: ReturnSale = {
    id: uid("ret_"),
    saleId,
    ts: new Date().toISOString(),
    items: [item],
    totalRefund: itemTotal,
    cashierId: cu?.id || "system",
    cashierName: cu?.fullName || "النظام"
  };
  
  const updatedItems = sale.items.filter(i => i.medicineId !== medicineId);
  let updatedSales = [...st.sales];
  
  if (updatedItems.length === 0) {
    // لو الفاتورة مفيش فيها أصناف تانية، بنمسحها
    updatedSales = updatedSales.filter(x => x.id !== saleId);
  } else {
    // لو لسه فيها أصناف، بنحدث إجمالي الفاتورة
    updatedSales = updatedSales.map(s => s.id === saleId ? {
      ...s,
      items: updatedItems,
      total: s.total - itemTotal,
      cost: s.cost - itemCost,
      profit: (s.total - itemTotal) - (s.cost - itemCost)
    } : s);
  }

  setState(s => ({
    ...s,
    sales: updatedSales,
    returns: [ret, ...(s.returns || [])],
    medicines: s.medicines.map(m => m.id === medicineId ? { ...m, quantity: m.quantity + item.qty } : m)
  }));
  
  logAudit("sale.return_item", `إرجاع صنف ${item.medicineName} من فاتورة #${saleId.slice(0,8)}`);
  return { ok: true };
}

export function getTodaysSales(): Sale[] {
  const today = todayISO();
  return getState().sales.filter((s) => s.ts.slice(0, 10) === today);
}

export function closeDay(pin: string): { ok: boolean; error?: string; closing?: DailyClosing } {
  if (!verifyPin(pin)) return { ok: false, error: "رقم الـ PIN غير صحيح" };
  const cu = getCurrentUser();
  if (!cu) return { ok: false, error: "يجب تسجيل الدخول" };
  const today = todayISO();
  const todays = getTodaysSales();
  if (todays.length === 0) return { ok: false, error: "لا يوجد مبيعات اليوم للإغلاق" };
  const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, wallet: 0, insurance: 0 };
  todays.forEach((s) => { totals[s.paymentMethod] += s.total; });
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const closing: DailyClosing = { id: uid("eod_"), closedAt: new Date().toISOString(), date: today, totals, grandTotal, salesCount: todays.length, closedById: cu.id, closedByName: cu.fullName };
  setState((st) => ({
    ...st,
    dailyClosings: [closing, ...st.dailyClosings],
    sales: st.sales.filter((s) => s.ts.slice(0, 10) !== today),
  }));
  logAudit("payments.close_day", `إغلاق يوم ${today}: ${grandTotal.toFixed(2)} من ${todays.length} فواتير`, "critical");
  return { ok: true, closing };
}

export function upsertUser(u: User) {
  setState((st) => {
    const exists = st.users.some((x) => x.id === u.id);
    return { ...st, users: exists ? st.users.map((x) => (x.id === u.id ? u : x)) : [...st.users, u] };
  });
  logAudit("user.upsert", `${u.username} (${u.role})`, "warn");
}

export function deleteUser(id: string) {
  setState((st) => ({ ...st, users: st.users.filter((u) => u.id !== id) }));
  logAudit("user.delete", `تم حذف مستخدم`, "warn");
}

export function computeAlerts(): Notification[] {
  const st = getState();
  const alerts: Notification[] = [];
  for (const m of st.medicines) {
    const days = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / 86400000);
    if (m.quantity <= 10) alerts.push({ id: `low_${m.id}`, ts: new Date().toISOString(), type: "low_stock", title: `نقص مخزون: ${m.name}`, message: `متبقي ${m.quantity} علبة فقط`, read: false, urgent: m.quantity <= 5 });
    if (days <= 30 && days >= 0) alerts.push({ id: `exp_${m.id}`, ts: new Date().toISOString(), type: "near_expiry", title: `قرب انتهاء الصلاحية: ${m.name}`, message: `تنتهي الصلاحية خلال ${days} يوم (${m.expiryDate})`, read: false, urgent: days <= 7 });
    else if (days < 0) alerts.push({ id: `exp_${m.id}`, ts: new Date().toISOString(), type: "near_expiry", title: `منتهي الصلاحية: ${m.name}`, message: `انتهت الصلاحية منذ ${Math.abs(days)} يوم`, read: false, urgent: true });
  }
  return alerts;
}

export function exportBackup(): string { return JSON.stringify(state, null, 2); }
export function importBackup(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as AppState;
    if (!parsed.users || !parsed.medicines) throw new Error("ملف النسخة الاحتياطية غير صالح");
    setState(() => parsed);
    logAudit("system.restore", "تم استعادة النسخة الاحتياطية", "critical");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export function resetDemoData() { setState(() => seed()); logAudit("system.reset", "تم تهيئة النظام بالكامل", "critical"); }

export { uid, todayISO };