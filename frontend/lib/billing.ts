export const FREE_SCAN_LIMIT = 3;
export const SCAN_USAGE_STORAGE_KEY = "dealpilot.scanUsage.v1";
export const PAID_ACCESS_STORAGE_KEY = "dealpilot.paidAccess.v1";

export type PaidAccess = {
  plan: string;
  unlockedAt: string;
};

export function readScanUsage(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SCAN_USAGE_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function writeScanUsage(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCAN_USAGE_STORAGE_KEY, String(Math.max(0, value)));
}

export function readPaidAccess(): PaidAccess | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PAID_ACCESS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PaidAccess;
  } catch {
    return null;
  }
}

export function writePaidAccess(plan: string) {
  if (typeof window === "undefined") return;
  const payload: PaidAccess = {
    plan,
    unlockedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PAID_ACCESS_STORAGE_KEY, JSON.stringify(payload));
}
