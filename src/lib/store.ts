/**
 * Frontend-only in-memory store for the Pharmacy ERP demo.
 * State persists across navigations within a session via localStorage.
 * NOTE: This is a DEMO only — no real backend, no real auth.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "admin" | "employee";

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  password: string; // demo only
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
  expiryDate: string; // ISO date
  quantity: number; // boxes
  purchasePrice: number;
  sellingPrice: number;
  requiresPrescription: boolean;
  supplierId: string | null;
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
  ts: string; // ISO datetime
  items: SaleItem[];
  total: number;
  cost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashierId: string;
  cashierName: string;
}

export interface DailyClosing {
  id: string;
  closedAt: string;
  date: string; // YYYY-MM-DD
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
  pinHash: string | null; // demo: stored as plain "hash"
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
    { id: uid("m_"), name: "Paracetamol 500mg", barcode: "6221001000011", expiryDate: isoFromDaysOffset(420), quantity: 124, purchasePrice: 8, sellingPrice: 15, requiresPrescription: false, supplierId: sup1, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Amoxicillin 500mg", barcode: "6221001000028", expiryDate: isoFromDaysOffset(180), quantity: 8, purchasePrice: 22, sellingPrice: 38, requiresPrescription: true, supplierId: sup2, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Ibuprofen 400mg", barcode: "6221001000035", expiryDate: isoFromDaysOffset(20), quantity: 45, purchasePrice: 11, sellingPrice: 22, requiresPrescription: false, supplierId: sup1, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Vitamin C 1000mg", barcode: "6221001000042", expiryDate: isoFromDaysOffset(700), quantity: 78, purchasePrice: 30, sellingPrice: 55, requiresPrescription: false, supplierId: sup3, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Insulin Glargine", barcode: "6221001000059", expiryDate: isoFromDaysOffset(15), quantity: 3, purchasePrice: 220, sellingPrice: 320, requiresPrescription: true, supplierId: sup2, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Cough Syrup 120ml", barcode: "6221001000066", expiryDate: isoFromDaysOffset(300), quantity: 36, purchasePrice: 18, sellingPrice: 35, requiresPrescription: false, supplierId: sup1, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Omeprazole 20mg", barcode: "6221001000073", expiryDate: isoFromDaysOffset(540), quantity: 60, purchasePrice: 14, sellingPrice: 28, requiresPrescription: false, supplierId: sup3, createdAt: new Date().toISOString() },
    { id: uid("m_"), name: "Metformin 850mg", barcode: "6221001000080", expiryDate: isoFromDaysOffset(90), quantity: 6, purchasePrice: 12, sellingPrice: 24, requiresPrescription: true, supplierId: sup2, createdAt: new Date().toISOString() },
  ];
  return {
    users: [
      { id: adminId, username: "admin", fullName: "Omar Sameh", email: "omarsamehfouad1@gmail.com", phone: "+201000000000", role: "admin", password: "admin123", active: true, createdAt: new Date().toISOString(), dailyHours: 8 },
      { id: empId, username: "employee", fullName: "Sara Ahmed", email: "sara@careplus.com", phone: "+201111111111", role: "employee", password: "employee123", active: true, createdAt: new Date().toISOString(), dailyHours: 8 },
    ],
    currentUserId: null,
    suppliers: [
      { id: sup1, name: "Pharma Egypt Co.", phones: ["+20223456789", "+20100000001"], address: "Nasr City, Cairo" },
      { id: sup2, name: "MediSupply Intl.", phones: ["+20227778888"], address: "Heliopolis, Cairo" },
      { id: sup3, name: "GreenLeaf Distributors", phones: ["+20233334444"], address: "Giza" },
    ],
    medicines: meds,
    sales: [],
    dailyClosings: [],
    auditLogs: [
      { id: uid("a_"), ts: new Date().toISOString(), actorId: adminId, actorName: "Omar Sameh", action: "system.seed", details: "Demo data initialized", severity: "info" },
    ],
    managerSecurity: { pinHash: null, recoveryEmail: "omarsamehfouad1@gmail.com", recoveryPhone: "+201000000000", setupComplete: false },
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

// ---- Hook ----
export function useStore<T>(selector: (s: AppState) => T): T {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
  void hydrated;
  return snapshot;
}

export function getCurrentUser(): User | null {
  const s = getState();
  return s.users.find((u) => u.id === s.currentUserId) || null;
}

// ---- Audit ----
function logAudit(action: string, details?: string, severity: AuditLog["severity"] = "info") {
  const cu = getCurrentUser();
  setState((s) => ({
    ...s,
    auditLogs: [
      { id: uid("a_"), ts: new Date().toISOString(), actorId: cu?.id || "system", actorName: cu?.fullName || "System", action, details, severity },
      ...s.auditLogs,
    ].slice(0, 500),
  }));
}

// ---- Auth ----
export function login(username: string, password: string): { ok: true; user: User } | { ok: false; error: string } {
  const s = getState();
  const user = s.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: "بيانات الدخول غير صحيحة" };
  if (!user.active) return { ok: false, error: "هذا الحساب معطل" };
  setState((s) => ({ ...s, currentUserId: user.id }));
  logAudit("auth.login", `User ${user.username} logged in`);
  return { ok: true, user };
}

export function logout() {
  logAudit("auth.logout", "User logged out");
  setState((s) => ({ ...s, currentUserId: null }));
}

// ---- Theme ----
export function setTheme(theme: "dark" | "light") {
  setState((s) => ({ ...s, theme }));
}

// ---- Manager security ----
export function setupManagerPin(input: { pin: string; recoveryEmail: string; recoveryPhone: string }) {
  setState((s) => ({
    ...s,
    managerSecurity: {
      pinHash: input.pin,
      recoveryEmail: input.recoveryEmail,
      recoveryPhone: input.recoveryPhone,
      setupComplete: true,
    },
  }));
  logAudit("security.pin_setup", "Manager PIN configured", "critical");
}

export function verifyPin(pin: string): boolean {
  return getState().managerSecurity.pinHash === pin;
}

export function resetPinWithOld(oldPin: string, newPin: string): boolean {
  if (!verifyPin(oldPin)) return false;
  setState((s) => ({ ...s, managerSecurity: { ...s.managerSecurity, pinHash: newPin } }));
  logAudit("security.pin_reset_old", "PIN reset using old PIN", "critical");
  return true;
}

export function resetPinWithOtp(otp: string, newPin: string): boolean {
  if (!/^\d{6}$/.test(otp)) return false;
  setState((s) => ({ ...s, managerSecurity: { ...s.managerSecurity, pinHash: newPin } }));
  logAudit("security.pin_reset_otp", "PIN reset via OTP", "critical");
  return true;
}

// ---- Suppliers ----
export function upsertSupplier(s: Supplier) {
  setState((st) => {
    const exists = st.suppliers.some((x) => x.id === s.id);
    return {
      ...st,
      suppliers: exists ? st.suppliers.map((x) => (x.id === s.id ? s : x)) : [...st.suppliers, s],
    };
  });
  logAudit("supplier.upsert", `Supplier ${s.name}`);
}

export function deleteSupplier(id: string) {
  setState((st) => ({
    ...st,
    suppliers: st.suppliers.filter((x) => x.id !== id),
    medicines: st.medicines.map((m) => (m.supplierId === id ? { ...m, supplierId: null } : m)),
  }));
  logAudit("supplier.delete", `Deleted supplier ${id}`);
}

// ---- Medicines ----
export function upsertMedicine(m: Medicine): { ok: boolean; error?: string } {
  const st = getState();
  const dup = st.medicines.find((x) => x.barcode === m.barcode && x.id !== m.id);
  if (dup) return { ok: false, error: "الباركود مستخدم بالفعل" };
  setState((st) => {
    const exists = st.medicines.some((x) => x.id === m.id);
    return {
      ...st,
      medicines: exists ? st.medicines.map((x) => (x.id === m.id ? m : x)) : [...st.medicines, m],
    };
  });
  logAudit("medicine.upsert", `${m.name} (${m.barcode})`);
  return { ok: true };
}

export function deleteMedicine(id: string) {
  const m = getState().medicines.find((x) => x.id === id);
  setState((st) => ({ ...st, medicines: st.medicines.filter((x) => x.id !== id) }));
  logAudit("medicine.delete", m ? `Deleted ${m.name}` : `Deleted ${id}`, "warn");
}

export function findMedicineByBarcode(barcode: string): Medicine | undefined {
  return getState().medicines.find((m) => m.barcode === barcode);
}

// ---- Sales ----
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
  const sale: Sale = {
    id: uid("sale_"),
    ts: new Date().toISOString(),
    items: input.items,
    total,
    cost,
    profit: total - cost,
    paymentMethod: input.paymentMethod,
    cashierId: cu.id,
    cashierName: cu.fullName,
  };
  setState((st) => ({
    ...st,
    sales: [sale, ...st.sales],
    medicines: st.medicines.map((m) => {
      const it = input.items.find((i) => i.medicineId === m.id);
      return it ? { ...m, quantity: m.quantity - it.qty } : m;
    }),
  }));
  logAudit("sale.record", `${sale.items.length} items, ${total.toFixed(2)}`);
  return { ok: true, sale };
}

// ---- Daily payments / closing ----
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
  const closing: DailyClosing = {
    id: uid("eod_"),
    closedAt: new Date().toISOString(),
    date: today,
    totals,
    grandTotal,
    salesCount: todays.length,
    closedById: cu.id,
    closedByName: cu.fullName,
  };
  setState((st) => ({
    ...st,
    dailyClosings: [closing, ...st.dailyClosings],
    sales: st.sales.filter((s) => s.ts.slice(0, 10) !== today),
  }));
  logAudit("payments.close_day", `Closed ${today}: ${grandTotal.toFixed(2)} from ${todays.length} sales`, "critical");
  return { ok: true, closing };
}

// ---- Users (admin) ----
export function upsertUser(u: User) {
  setState((st) => {
    const exists = st.users.some((x) => x.id === u.id);
    return { ...st, users: exists ? st.users.map((x) => (x.id === u.id ? u : x)) : [...st.users, u] };
  });
  logAudit("user.upsert", `${u.username} (${u.role})`, "warn");
}

export function deleteUser(id: string) {
  setState((st) => ({ ...st, users: st.users.filter((u) => u.id !== id) }));
  logAudit("user.delete", `Deleted user ${id}`, "warn");
}

// ---- Notifications (derived + persisted dismissals) ----
export function computeAlerts(): Notification[] {
  const st = getState();
  const alerts: Notification[] = [];
  for (const m of st.medicines) {
    const days = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / 86400000);
    
    // ترجمة الإشعارات للعربي من هنا
    if (m.quantity <= 10) {
      alerts.push({
        id: `low_${m.id}`,
        ts: new Date().toISOString(),
        type: "low_stock",
        title: `نقص مخزون: ${m.name}`,
        message: `متبقي ${m.quantity} علبة فقط`,
        read: false,
        urgent: m.quantity <= 5,
      });
    }
    if (days <= 30 && days >= 0) {
      alerts.push({
        id: `exp_${m.id}`,
        ts: new Date().toISOString(),
        type: "near_expiry",
        title: `قرب انتهاء الصلاحية: ${m.name}`,
        message: `تنتهي الصلاحية خلال ${days} يوم (${m.expiryDate})`,
        read: false,
        urgent: days <= 7,
      });
    } else if (days < 0) {
      alerts.push({
        id: `exp_${m.id}`,
        ts: new Date().toISOString(),
        type: "near_expiry",
        title: `منتهي الصلاحية: ${m.name}`,
        message: `انتهت الصلاحية منذ ${Math.abs(days)} يوم`,
        read: false,
        urgent: true,
      });
    }
  }
  return alerts;
}

// ---- Backup / restore ----
export function exportBackup(): string {
  return JSON.stringify(state, null, 2);
}

export function importBackup(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as AppState;
    if (!parsed.users || !parsed.medicines) throw new Error("ملف النسخة الاحتياطية غير صالح");
    setState(() => parsed);
    logAudit("system.restore", "Backup restored", "critical");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function resetDemoData() {
  setState(() => seed());
  logAudit("system.reset", "Demo data reset", "critical");
}

export { uid, todayISO };