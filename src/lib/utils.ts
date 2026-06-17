import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with grouping + tabular intent. */
export function formatNumber(value: number | null | undefined, opts?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", opts).format(value);
}

/** Format money. Region drives currency + locale (AU/USA per Architecture 01 §1). */
export function formatMoney(
  cents: number | null | undefined,
  currency: "AUD" | "USD" = "AUD",
) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Compact percentage with one decimal. */
export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
