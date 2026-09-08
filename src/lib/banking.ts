// Banking utility helpers - account number generation, EMI calc, currency format

import { Prisma } from "@prisma/client";

export const CURRENCY = "INR";

/**
 * Convert a Prisma Decimal (or number/string/null) into a JS number.
 * Prisma returns Decimal.js objects for @db.Decimal columns; we need
 * plain numbers for Intl formatting and arithmetic.
 */
export function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (v instanceof Prisma.Decimal) return v.toNumber();
  if (typeof v === "string" || typeof v === "bigint") return Number(v);
  // Decimal-like object with toNumber method
  if (v && typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v) || 0;
}

export function formatCurrency(amount: unknown): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(toNumber(amount));
}

export function formatNumber(n: unknown): string {
  return new Intl.NumberFormat("en-IN").format(toNumber(n));
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Generate a 12-digit bank account number, random but not starting with 0
export function generateAccountNumber(): string {
  let n = "";
  for (let i = 0; i < 12; i++) {
    n += Math.floor(Math.random() * 10).toString();
  }
  if (n[0] === "0") n = "1" + n.slice(1);
  return n;
}

// Generate a customer ID like CUS-2025-0001
export function generateCustomerNo(seq: number): string {
  return `CUS-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

// 16-digit card number, Luhn-valid would be nice but uniqueness is enough for demo
export function generateCardNumber(): string {
  let n = "4"; // visa prefix
  for (let i = 0; i < 15; i++) {
    n += Math.floor(Math.random() * 10).toString();
  }
  return n;
}

// Transaction reference like TXN-YYYYMMDD-XXXXXX
export function generateTxnRef(): string {
  const d = new Date();
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `TXN-${ymd}-${rand}`;
}

// Loan number like LN-YYYY-0001
export function generateLoanNo(seq: number): string {
  return `LN-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

// EMI formula (reducing balance): P * r * (1+r)^n / ((1+r)^n - 1)
export function calculateEMI(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

// Simple hash for passwords (not secure - demo only)
export async function hashPassword(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s + "::cbs-salt");
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(s: string, hash: string): Promise<boolean> {
  const h = await hashPassword(s);
  return h === hash;
}

// 3-digit CVV hash (demo)
export function hashCvv(cvv: string): string {
  // NOT secure - just for demo storage
  return `h_${cvv}`;
}

// Branch IFSC generator
export function generateIfsc(bankCode: string, branchCode: string): string {
  return `${bankCode}0${branchCode}`;
}
