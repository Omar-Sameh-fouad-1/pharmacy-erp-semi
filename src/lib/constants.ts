export const PHARMACY_NAME = "CarePlus Pharmacy";
export const CURRENCY = "EGP";
export const LOW_STOCK_THRESHOLD = 10;
export const NEAR_EXPIRY_DAYS = 30;

export function formatMoney(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY}`;
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}