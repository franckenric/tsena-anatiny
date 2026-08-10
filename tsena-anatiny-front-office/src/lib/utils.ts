import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatAr(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Number(value) || 0)} Ar`;
}

export const PHONE_PREFIX = "+261 ";

export function formatPhoneMadagascar(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return PHONE_PREFIX;

  const localDigits = digits.startsWith("261") ? digits.slice(3) : digits;
  const limited = localDigits.slice(0, 9);

  const p1 = limited.slice(0, 2);
  const p2 = limited.slice(2, 4);
  const p3 = limited.slice(4, 7);
  const p4 = limited.slice(7, 9);

  const parts = [PHONE_PREFIX];
  if (p1) parts.push(p1);
  if (p2) parts.push(p2);
  if (p3) parts.push(p3);
  if (p4) parts.push(p4);
  return parts.join(" ");
}

export function isPhonePrefixOnly(value: string): boolean {
  return value.trim() === PHONE_PREFIX.trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export const PHONE_FORMAT_REGEX =
  /^\+261\s\d{2}\s\d{2}\s\d{3}\s\d{2}$/;

export function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

const RECENT_KEY = "fo.recent.products";
const RECENT_LIMIT = 12;

export function getRecentProductIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.filter((n): n is number => typeof n === "number").slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function addRecentProductId(id: number): number[] {
  const next = [id, ...getRecentProductIds().filter((x) => x !== id)].slice(
    0,
    RECENT_LIMIT
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible: on ignore
  }
  return next;
}
